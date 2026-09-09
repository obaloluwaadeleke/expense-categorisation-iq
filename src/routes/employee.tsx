import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { StatusBadge } from "@/components/expense/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  APPROVAL_THRESHOLD,
  DEPARTMENTS,
  PAYMENT_METHODS,
  YOUR_MAKE_WEBHOOK_URL,
  formatNaira,
  generateReference,
  type Department,
  type PaymentMethod,
} from "@/lib/expense-data";

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Submit an Expense — ExpenseIQ Employee" },
      {
        name: "description",
        content:
          "Submit a business expense claim in Naira with receipt upload and track your past submissions and their approval status.",
      },
      { property: "og:title", content: "Submit an Expense — ExpenseIQ Employee" },
      {
        property: "og:description",
        content:
          "Submit a business expense claim in Naira with receipt upload and track your past submissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeePage,
});

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

const STORAGE_KEY = "expenseiq.my-submissions";

type LocalSubmission = {
  reference: string;
  title: string;
  amount: number;
  department: string;
  date: string;
  status: "Pending";
};

function readLocal(): LocalSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalSubmission[]) : [];
  } catch {
    return [];
  }
}

function EmployeePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [date, setDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<LocalSubmission[]>([]);

  useEffect(() => {
    setSubmissions(readLocal());
  }, []);

  const numericAmount = Number(amount) || 0;
  const needsApproval = numericAmount >= APPROVAL_THRESHOLD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receipt) {
      setReceiptError("Please attach a receipt (image or PDF).");
      return;
    }
    setReceiptError(null);
    setFormError(null);
    setSubmitting(true);

    const ref = generateReference();

    try {
      // 1. Upload the receipt and build a shareable link.
      let receiptUrl: string | null = null;
      const safeName = receipt.name.replace(/[^\w.\-]+/g, "_");
      const path = `${ref}/${safeName}`;
      const upload = await supabase.storage
        .from("receipts")
        .upload(path, receipt, { upsert: true, contentType: receipt.type });
      if (upload.error) throw upload.error;

      const signed = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      receiptUrl = signed.data?.signedUrl ?? null;

      // 2. Save the claim to the database.
      const record = {
        reference: ref,
        employee_name: fullName,
        employee_email: email,
        department,
        vendor,
        amount: numericAmount,
        purpose: description,
        payment_method: paymentMethod,
        project_client: project,
        additional_notes: notes,
        expense_date: date,
        receipt_url: receiptUrl,
        status: "pending",
        requires_approval: needsApproval,
      };

      const { error: insertError } = await supabase.from("expenses").insert(record);
      if (insertError) throw insertError;

      // 3. Notify Make with every field, including the receipt link.
      try {
        await fetch(YOUR_MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...record,
            receipt_name: receipt.name,
            submitted_at: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.error("Make webhook failed", webhookError);
      }

      const local: LocalSubmission = {
        reference: ref,
        title: vendor || description.slice(0, 40) || "Expense claim",
        amount: numericAmount,
        department,
        date,
        status: "Pending",
      };
      const next = [local, ...readLocal()].slice(0, 25);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSubmissions(next);
      setReference(ref);
    } catch (err) {
      console.error("Failed to submit expense", err);
      setFormError("We couldn't send your expense. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }


  function resetForm() {
    setFullName("");
    setEmail("");
    setDepartment("");
    setDate("");
    setVendor("");
    setAmount("");
    setDescription("");
    setPaymentMethod("");
    setProject("");
    setNotes("");
    setReceipt(null);
    setReference(null);
  }

  if (reference) {
    return (
      <AppShell title="Expense submitted">
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-approved">
            <CheckCircle2 className="h-7 w-7 text-approved-foreground" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-card-foreground">
            Submission received
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your expense has been sent for review. Keep this reference number for tracking.
          </p>
          <p className="mt-5 rounded-lg bg-secondary px-4 py-3 font-mono text-lg font-semibold tracking-wide text-foreground">
            {reference}
          </p>
          <button
            onClick={resetForm}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Submit another expense
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="File your expense"
      subtitle="No login needed — complete the form below and you'll get a reference number."
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-3"
        >
          <h2 className="text-base font-semibold text-card-foreground">New expense</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Employee Name">
              <input
                required
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adaeze Nwosu"
              />
            </Field>
            <Field label="Employee Email">
              <input
                required
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adaeze@company.com"
              />
            </Field>
            <Field label="Department">
              <select
                required
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
              >
                <option value="">Select a department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expense Date">
              <input
                required
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Vendor / Supplier Name">
              <input
                required
                className={inputClass}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Arik Air"
              />
            </Field>
            <Field label="Amount (NGN ₦)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Purpose / Business Reason">
                <textarea
                  required
                  rows={4}
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Payment Method
              </span>
              <div className="grid gap-2 sm:grid-cols-4">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                      paymentMethod === m
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-input text-muted-foreground hover:border-accent"
                    }`}
                  >
                    <input
                      required
                      type="radio"
                      name="paymentMethod"
                      className="accent-accent"
                      value={m}
                      checked={paymentMethod === m}
                      onChange={() => setPaymentMethod(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Project / Client (optional)">
              <input
                className={inputClass}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Q3 enterprise pitch"
              />
            </Field>
            <Field label="Receipt (image or PDF)">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-secondary/50 px-3 py-2 text-sm text-muted-foreground transition hover:border-accent">
                <Upload className="h-4 w-4" />
                <span className="truncate">{receipt ? receipt.name : "Choose file"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </label>
              {receiptError && (
                <span className="mt-1 block text-xs text-destructive">{receiptError}</span>
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Additional Notes (optional)">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add other context or clarification"
                />
              </Field>
            </div>
          </div>

          {needsApproval && (
            <p className="mt-4 rounded-md bg-pending px-4 py-3 text-sm font-medium text-pending-foreground">
              ⚠ This amount requires manager approval.
            </p>
          )}

          {formError && (
            <p className="mt-4 text-sm font-medium text-destructive">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit expense"}
          </button>
        </form>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-card-foreground">My submissions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Claims you have sent from this device.
          </p>

          {submissions.length === 0 ? (
            <p className="mt-4 rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Nothing submitted yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Expense</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.reference} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-3">
                        <span className="font-medium text-foreground">{s.title}</span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {s.reference}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">{formatNaira(s.amount)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">
                        {s.date}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
