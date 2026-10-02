import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { AIRTABLE_BASE_ID, AIRTABLE_EXPENSES_TABLE, AIRTABLE_FIELDS } from "./airtable-config";
import { type Expense, type Status } from "./expense-data";

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
  if (raw === "needs_clarification" || raw === "needs clarification") return "Needs Clarification";
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
  // Independent lookups: run them together rather than back to back.
  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    context.supabase.from("profiles").select("email").eq("id", context.userId).maybeSingle(),
  ]);
  const roles = ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role);
  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("manager")
      ? "manager"
      : "employee";

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
// Decision — managers and admins only.
// Updates the Airtable "Status" column ONLY (no comments, notes or webhooks),
// so Airtable automations / Make triggers watching Status fire cleanly.
// The local status is mirrored in Supabase so the queue stays accurate.
// ---------------------------------------------------------------------------
const AIRTABLE_GATEWAY = "https://connector-gateway.lovable.dev/airtable";

async function airtableRequest(path: string, init?: RequestInit) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const airtableKey = process.env["AIRTABLE_API_KEY"];
  if (!lovableKey || !airtableKey) {
    throw new Error("Airtable connection is not configured.");
  }
  const response = await fetch(`${AIRTABLE_GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": airtableKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Airtable request failed [${response.status}]: ${body}`);
    throw new Error(`Airtable request failed [${response.status}]: ${body}`);
  }
  return response.json() as Promise<any>;
}

async function updateAirtableStatus(reference: string, status: Status) {
  const table = encodeURIComponent(AIRTABLE_EXPENSES_TABLE);
  const formula = encodeURIComponent(`{Reference}='${reference.replace(/'/g, "\\'")}'`);
  const found = await airtableRequest(
    `/v0/${AIRTABLE_BASE_ID}/${table}?maxRecords=1&filterByFormula=${formula}`,
  );
  const recordId = found?.records?.[0]?.id as string | undefined;
  if (!recordId) {
    throw new Error(`No Airtable record found for reference ${reference}.`);
  }
  await airtableRequest(`/v0/${AIRTABLE_BASE_ID}/${table}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { [AIRTABLE_FIELDS.status]: status } }),
  });
  return recordId;
}

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

    const { data: row, error: readError } = await ctx.supabase
      .from("expenses")
      .select("reference")
      .eq("id", data.id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);

    const reference = (row as { reference?: string } | null)?.reference ?? data.id;

    // Airtable: Status column only.
    await updateAirtableStatus(reference, data.decision);

    // Mirror the status locally so the queue and dashboard stay in sync.
    const { error } = await ctx.supabase
      .from("expenses")
      .update({ status: toDbStatus(data.decision), updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    return { updated: true, reference, status: data.decision, source: "airtable" as const };
  });

// ---------------------------------------------------------------------------
// AI categories — managers and admins only.
// The expenses table has no category column: Make writes the AI category to
// Airtable. Returns reference -> category so the dashboard can join it onto
// the Supabase records. Fetched separately so a slow Airtable call never holds
// up the rest of the dashboard.
// ---------------------------------------------------------------------------
export const listExpenseCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AuthContext;
    const { role } = await resolveIdentity(ctx);
    if (role !== "manager" && role !== "admin") {
      throw new Error("Forbidden: only managers and admins can read categories.");
    }

    const table = encodeURIComponent(AIRTABLE_EXPENSES_TABLE);
    const fields = ["Reference", AIRTABLE_FIELDS.aiCategory]
      .map((f) => `fields%5B%5D=${encodeURIComponent(f)}`)
      .join("&");
    const categories: Record<string, string> = {};
    let offset: string | undefined;
    do {
      const page = await airtableRequest(
        `/v0/${AIRTABLE_BASE_ID}/${table}?pageSize=100&${fields}${offset ? `&offset=${encodeURIComponent(offset)}` : ""}`,
      );
      for (const record of page?.records ?? []) {
        const reference = record?.fields?.["Reference"];
        const category = record?.fields?.[AIRTABLE_FIELDS.aiCategory];
        if (typeof reference === "string" && typeof category === "string" && category.trim()) {
          categories[reference] = category.trim();
        }
      }
      offset = page?.offset;
    } while (offset);

    return { categories };
  });
