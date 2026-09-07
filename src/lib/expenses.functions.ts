import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  AIRTABLE_BASE_ID,
  AIRTABLE_CONFIGURED,
  AIRTABLE_EXPENSES_TABLE,
  AIRTABLE_FIELDS as F,
} from "./airtable-config";
import { MOCK_EXPENSES, type Expense, type Status } from "./expense-data";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/airtable";

export type AppRole = "admin" | "manager" | "employee";

export interface ExpenseListResult {
  expenses: Expense[];
  source: "airtable" | "mock";
  role: AppRole;
  email: string;
}

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

function airtableReady() {
  return (
    AIRTABLE_CONFIGURED &&
    Boolean(process.env["LOVABLE_API_KEY"]) &&
    Boolean(process.env["AIRTABLE_API_KEY"])
  );
}

async function airtableFetch(
  path: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string> },
) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const airtableKey = process.env["AIRTABLE_API_KEY"];
  if (!lovableKey || !airtableKey) {
    throw new Error("Airtable connection is not configured for this project.");
  }
  const url = new URL(`${GATEWAY_URL}${path}`);
  for (const [key, value] of Object.entries(init?.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": airtableKey,
      "Content-Type": "application/json",
    },
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Airtable request failed [${response.status}]: ${errorBody}`);
    throw new Error(`Airtable request failed [${response.status}]: ${errorBody}`);
  }
  return (await response.json()) as { records?: AirtableRecord[]; id?: string };
}

function tablePath() {
  return `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_EXPENSES_TABLE)}`;
}

function str(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).join(", ");
  return String(value);
}

function toStatus(value: unknown): Status {
  const raw = str(value).trim();
  if (raw === "Approved") return "Approved";
  if (raw === "Rejected" || raw === "Declined") return "Rejected";
  if (raw === "Needs Clarification") return "Needs Clarification";
  return "Pending";
}

function referenceFor(record: AirtableRecord): string {
  const notes = str(record.fields[F.additionalNotes]);
  const match = notes.match(/EXP-\d{4}-\d{6}/);
  return match ? match[0] : `EXP-${record.id.slice(-6).toUpperCase()}`;
}

function mapRecord(record: AirtableRecord): Expense {
  const f = record.fields;
  const vendor = str(f[F.vendor]);
  const purpose = str(f[F.purpose]);
  const category = str(f[F.aiCategory]) || "Uncategorised";
  const reviewerNote = str(f[F.aiReviewerNote]);
  const approvalRequired = str(f[F.approvalRequired]);
  const duplicateRisk = str(f[F.duplicateRisk]);
  const policyBits = [
    approvalRequired ? `Approval required: ${approvalRequired}` : "",
    duplicateRisk ? `Duplicate risk: ${duplicateRisk}` : "",
  ].filter(Boolean);

  return {
    id: record.id,
    reference: referenceFor(record),
    fullName: str(f[F.employeeName]) || "Unknown",
    email: str(f[F.employeeEmail]),
    department: str(f[F.department]),
    title: vendor || purpose.slice(0, 60) || "Expense claim",
    amount: Number(f[F.amount] ?? 0),
    category,
    date: str(f[F.expenseDate]).slice(0, 10),
    description: purpose,
    vendor,
    paymentMethod: str(f[F.paymentMethod]),
    project: str(f[F.project]),
    notes: str(f[F.additionalNotes]),
    receiptName: str(f[F.receiptLink]) || undefined,
    status: toStatus(f[F.status]),
    aiRecommendation: str(f[F.approval]) || undefined,
    aiSummary: str(f[F.aiSummary]) || reviewerNote || undefined,
    categoryDetected: category,
    policyFlag: policyBits.join(" · ") || undefined,
    managerComment: str(f[F.managerNotes]) || undefined,
  };
}

function escapeFormulaValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

type AuthContext = {
  supabase: { from: (table: string) => any };
  userId: string;
  claims: Record<string, unknown>;
};

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
    .select("email, full_name, department")
    .eq("id", context.userId)
    .maybeSingle();

  const email = String(
    (profile as { email?: string } | null)?.email ?? context.claims["email"] ?? "",
  );

  return {
    role,
    email,
    fullName: (profile as { full_name?: string } | null)?.full_name ?? "",
    department: (profile as { department?: string } | null)?.department ?? "",
  };
}

// ---------------------------------------------------------------------------
// Reads — employees only ever see their own records; managers and admins see all.
// ---------------------------------------------------------------------------
export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExpenseListResult> => {
    const { role, email } = await resolveIdentity(context as unknown as AuthContext);

    if (!airtableReady()) {
      const mock =
        role === "employee"
          ? MOCK_EXPENSES.filter((e) => (e.email ?? "").toLowerCase() === email.toLowerCase())
          : MOCK_EXPENSES;
      return { expenses: mock, source: "mock", role, email };
    }

    const query: Record<string, string> = { pageSize: "100" };
    if (role === "employee") {
      query["filterByFormula"] =
        `LOWER({${F.employeeEmail}}) = '${escapeFormulaValue(email.toLowerCase())}'`;
    }

    const result = await airtableFetch(tablePath(), { query });
    const expenses = (result.records ?? []).map(mapRecord);
    return { expenses, source: "airtable", role, email };
  });

// ---------------------------------------------------------------------------
// Create — always filed against the signed-in person's own email.
// ---------------------------------------------------------------------------
export interface NewExpenseInput {
  fullName: string;
  department: string;
  date: string;
  vendor: string;
  amount: number;
  purpose: string;
  paymentMethod: string;
  project?: string;
  notes?: string;
  receiptName?: string;
  reference: string;
}

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewExpenseInput) => {
    if (!input.fullName?.trim()) throw new Error("Employee name is required.");
    if (!input.department?.trim()) throw new Error("Department is required.");
    if (!input.date?.trim()) throw new Error("Expense date is required.");
    if (!input.vendor?.trim()) throw new Error("Vendor is required.");
    if (!Number.isFinite(input.amount) || input.amount <= 0)
      throw new Error("Amount must be greater than zero.");
    if (!input.purpose?.trim()) throw new Error("Purpose is required.");
    if (!input.paymentMethod?.trim()) throw new Error("Payment method is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { email } = await resolveIdentity(context as unknown as AuthContext);

    const notes = [data.notes?.trim(), `Ref: ${data.reference}`].filter(Boolean).join("\n");

    if (!airtableReady()) {
      console.info("Airtable not configured — expense not persisted:", {
        ...data,
        email,
      });
      return { id: null, reference: data.reference, source: "mock" as const };
    }

    const fields: Record<string, unknown> = {
      [F.employeeName]: data.fullName,
      [F.employeeEmail]: email,
      [F.department]: data.department,
      [F.expenseDate]: data.date,
      [F.vendor]: data.vendor,
      [F.amount]: data.amount,
      [F.purpose]: data.purpose,
      [F.paymentMethod]: [data.paymentMethod],
      [F.project]: data.project ?? "",
      [F.additionalNotes]: notes,
      [F.receiptMissing]: data.receiptName ? "No" : "Yes",
    };

    const result = await airtableFetch(tablePath(), {
      method: "POST",
      body: { records: [{ fields }], typecast: true },
    });

    const created = result.records?.[0];
    return {
      id: created?.id ?? null,
      reference: data.reference,
      source: "airtable" as const,
    };
  });

// ---------------------------------------------------------------------------
// Decision — managers and admins only.
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
    const { role } = await resolveIdentity(context as unknown as AuthContext);
    if (role !== "manager" && role !== "admin") {
      throw new Error("Forbidden: only managers and admins can decide on expenses.");
    }

    if (!airtableReady()) {
      console.info("Airtable not configured — decision not persisted:", data);
      return { updated: false, source: "mock" as const };
    }

    await airtableFetch(`${tablePath()}/${data.id}`, {
      method: "PATCH",
      body: {
        fields: {
          [F.status]: data.decision,
          [F.managerNotes]: data.comment ?? "",
          [F.approvedAt]: new Date().toISOString().slice(0, 10),
        },
        typecast: true,
      },
    });

    return { updated: true, source: "airtable" as const };
  });
