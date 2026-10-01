// Public (no-login) expense submission pipeline.
// The employee form at /employee requires no account, so submissions are NOT
// written directly from the browser: every field and the receipt file are
// validated here, and the database/storage writes happen with the server-side
// (service-role) client. Row-level security denies direct anonymous writes.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  APPROVAL_THRESHOLD,
  DEPARTMENTS,
  PAYMENT_METHODS,
  generateReference,
} from "./expense-data";

const MAX_RECEIPT_BYTES = 20 * 1024 * 1024; // 20 MB, matches the storage bucket limit
const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
];

const submissionSchema = z.object({
  fullName: z.string().trim().min(1, "Employee name is required.").max(120),
  email: z.string().trim().email("A valid email is required.").max(200),
  department: z.string().refine((v): v is (typeof DEPARTMENTS)[number] =>
    (DEPARTMENTS as readonly string[]).includes(v), { message: "Invalid department." }),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A valid expense date is required."),
  vendor: z.string().trim().min(1, "Vendor is required.").max(200),
  amount: z.number().positive("Amount must be greater than zero.").max(1_000_000_000),
  purpose: z.string().trim().min(1, "Purpose is required.").max(5000),
  paymentMethod: z.string().refine((v): v is (typeof PAYMENT_METHODS)[number] =>
    (PAYMENT_METHODS as readonly string[]).includes(v), { message: "Invalid payment method." }),
  projectClient: z.string().trim().max(200).optional(),
  additionalNotes: z.string().trim().max(5000).optional(),
  receipt: z.object({
    name: z.string().trim().min(1).max(255),
    contentType: z.string().refine((v) => ALLOWED_RECEIPT_TYPES.includes(v), {
      message: "Receipt must be an image or a PDF.",
    }),
    size: z.number().int().positive().max(MAX_RECEIPT_BYTES, "Receipt must be 20 MB or smaller."),
    dataBase64: z.string().min(1),
  }),
});

export type SubmitExpenseInput = z.input<typeof submissionSchema>;

export interface SubmitExpenseResult {
  reference: string;
  receiptUrl: string | null;
}

export const submitExpense = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitExpenseInput) => {
    const parsed = submissionSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new Error(first?.message ?? "Invalid submission.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<SubmitExpenseResult> => {
    // Service-role client, loaded inside the handler (never shipped to the browser).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const reference = generateReference();
    const safeName = data.receipt.name.replace(/[^\w.\-]+/g, "_");
    const path = `${reference}/${safeName}`;

    // 1. Upload the receipt (server-side, validated).
    const bytes = Buffer.from(data.receipt.dataBase64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_RECEIPT_BYTES) {
      throw new Error("Receipt file is empty or too large.");
    }
    const upload = await supabaseAdmin.storage
      .from("receipts")
      .upload(path, bytes, { upsert: true, contentType: data.receipt.contentType });
    if (upload.error) throw new Error(upload.error.message);

    // 2. Long-lived signed link for reviewers.
    const signed = await supabaseAdmin.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const receiptUrl = signed.data?.signedUrl ?? null;

    // 3. Save the complete claim.
    const record = {
      reference,
      employee_name: data.fullName,
      employee_email: data.email,
      department: data.department,
      vendor: data.vendor,
      amount: data.amount,
      purpose: data.purpose,
      payment_method: data.paymentMethod,
      project_client: data.projectClient ?? null,
      additional_notes: data.additionalNotes ?? null,
      expense_date: data.expenseDate,
      receipt_url: receiptUrl,
      status: "pending",
      requires_approval: data.amount >= APPROVAL_THRESHOLD,
    };
    const { error: insertError } = await supabaseAdmin.from("expenses").insert(record);
    if (insertError) throw new Error(insertError.message);

    // 4. Notify Make with every field, including the receipt link.
    // Non-critical: the claim is already saved, so a missing secret or failed
    // webhook is logged but never fails the employee's submission.
    const makeWebhookUrl = process.env["MAKE_WEBHOOK_URL"];
    try {
      if (!makeWebhookUrl) {
        console.error("Make webhook skipped: MAKE_WEBHOOK_URL secret is not configured.");
      } else {
        const response = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...record,
            receipt_name: data.receipt.name,
            submitted_at: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          console.error(`Make webhook failed [${response.status}]`);
        }
      }
    } catch (webhookError) {
      console.error("Make webhook failed", webhookError);
    }

    return { reference, receiptUrl };
  });
