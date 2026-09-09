import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { YOUR_MAKE_WEBHOOK_URL, type Expense, type Status } from "./expense-data";

export type AppRole = "admin" | "manager" | "employee";

export interface ExpenseListResult {
  expenses: Expense[];
  source: "supabase";
  role: AppRole;
  email: string;
}

type AuthContext = {
  supabase: { from: (table: string) => any };
  userId: string;
  claims: Record<string, unknown>;
};

type ExpenseRow = {
  id: string;
  reference: string | null;
  employee_name: string | null;
  employee_email: string | null;
  department: string | null;
  vendor: string | null;
  amount: number | string | null;
  purpose: string | null;
  payment_method: string | null;
  project_client: string | null;
  additional_notes: string | null;
  expense_date: string | null;
  receipt_url: string | null;
  status: string | null;
  requires_approval: boolean | null;
  ai_summary: string | null;
  ai_reviewer_note: string | null;
  manager_comment: string | null;
  approved_by: string | null;
  submitted_at: string | null;
};

export function toStatus(value: unknown): Status {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "approved") return "Approved";
  if (raw === "rejected" || raw === "declined") return "Rejected";
  if (raw === "needs_clarification" || raw === "needs clarification")
    return "Needs Clarification";
  return "Pending";
}

export function toDbStatus(status: Status): string {
  if (status === "Approved") return "approved";
  if (status === "Rejected") return "rejected";
  if (status === "Needs Clarification") return "needs_clarification";
  return "pending";
}

function mapRow(row: ExpenseRow): Expense {
  const vendor = row.vendor ?? "";
  const purpose = row.purpose ?? "";
  return {
    id: row.id,
    reference: row.reference ?? row.id.slice(0, 8).toUpperCase(),
    fullName: row.employee_name ?? "Unknown",
    email: row.employee_email ?? undefined,
    department: row.department ?? "",
    title: vendor || purpose.slice(0, 60) || "Expense claim",
    amount: Number(row.amount ?? 0),
    category: row.payment_method ? `${row.payment_method}` : "Uncategorised",
    date: (row.expense_date ?? row.submitted_at ?? "").slice(0, 10),
    description: purpose,
    vendor,
    paymentMethod: row.payment_method ?? undefined,
    project: row.project_client ?? undefined,
    notes: row.additional_notes ?? undefined,
    receiptName: row.receipt_url ?? undefined,
    status: toStatus(row.status),
    aiRecommendation: row.ai_reviewer_note ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    categoryDetected: row.payment_method ?? undefined,
    policyFlag: row.requires_approval
      ? "Requires manager approval (₦100,000+)"
      : "No policy issues detected",
    managerComment: row.manager_comment ?? undefined,
  };
}

const SELECT_COLUMNS =
  "id, reference, employee_name, employee_email, department, vendor, amount, purpose, payment_method, project_client, additional_notes, expense_date, receipt_url, status, requires_approval, ai_summary, ai_reviewer_note, manager_comment, approved_by, submitted_at";

async function resolveIdentity(context: AuthContext) {
  const { data: roleRows } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role);
  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("manager")
      ? "manager"
      : "employee";

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("email")
    .eq("id", context.userId)
    .maybeSingle();

  const email = String(
    (profile as { email?: string } | null)?.email ?? context.claims["email"] ?? "",
  );

  return { role, email };
}

// ---------------------------------------------------------------------------
// Reads — managers and admins see live records from the expenses table.
// ---------------------------------------------------------------------------
export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExpenseListResult> => {
    const ctx = context as unknown as AuthContext;
    const { role, email } = await resolveIdentity(ctx);

    if (role !== "manager" && role !== "admin") {
      return { expenses: [], source: "supabase", role, email };
    }

    const { data, error } = await ctx.supabase
      .from("expenses")
      .select(SELECT_COLUMNS)
      .order("submitted_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      expenses: ((data ?? []) as ExpenseRow[]).map(mapRow),
      source: "supabase",
      role,
      email,
    };
  });

// ---------------------------------------------------------------------------
// Decision — managers and admins only. Writes to Supabase, then notifies Make.
// ---------------------------------------------------------------------------
export const decideExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      decision: "Approved" | "Rejected" | "Needs Clarification";
      comment?: string;
    }) => {
      if (!input.id?.trim()) throw new Error("Expense id is required.");
      if (!["Approved", "Rejected", "Needs Clarification"].includes(input.decision))
        throw new Error("Invalid decision.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthContext;
    const { role } = await resolveIdentity(ctx);
    if (role !== "manager" && role !== "admin") {
      throw new Error("Forbidden: only managers and admins can decide on expenses.");
    }

    const { data: updated, error } = await ctx.supabase
      .from("expenses")
      .update({
        status: toDbStatus(data.decision),
        manager_comment: data.comment ?? "",
        approved_by: "Manager",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("reference")
      .maybeSingle();

    if (error) throw new Error(error.message);

    const reference = (updated as { reference?: string } | null)?.reference ?? data.id;

    try {
      await fetch(YOUR_MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "decision",
          reference,
          decision: data.decision,
          comment: data.comment ?? "",
          approved_by: "Manager",
          decided_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("Make webhook notification failed", err);
    }

    return { updated: true, reference, source: "supabase" as const };
  });
