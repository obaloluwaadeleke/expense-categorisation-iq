import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { AiBadge, HighBadge, StatusBadge } from "@/components/expense/StatusBadge";
import {
  APPROVAL_THRESHOLD,
  MOCK_EXPENSES,
  YOUR_MAKE_UPDATE_WEBHOOK,
  formatNaira,
} from "@/lib/expense-data";

// Configure in src/lib/expense-data.ts
const UPDATE_WEBHOOK = YOUR_MAKE_UPDATE_WEBHOOK;

type Search = { decision?: "approve" | "reject" };

export const Route = createFileRoute("/manager/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    decision:
      search["decision"] === "approve" || search["decision"] === "reject"
        ? search["decision"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Expense Detail — ExpenseIQ Manager" },
      {
        name: "description",
        content:
          "Full expense detail with AI category detection, policy flag, recommendation and summary, plus approve or reject with a manager comment.",
      },
      { property: "og:title", content: "Expense Detail — ExpenseIQ Manager" },
      {
        property: "og:description",
        content: "Full expense detail with AI analysis and manager decision controls.",
      },
    ],
  }),
  component: ExpenseDetail,
});

function ExpenseDetail() {
  const { id } = Route.useParams();
  const { decision } = Route.useSearch();
  const navigate = useNavigate();
  const expense = MOCK_EXPENSES.find((e) => e.id === id);

  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<"Approved" | "Rejected" | null>(null);

  if (!expense) {
    return (
      <AppShell title="Expense not found">
        <Link to="/manager" className="text-sm font-medium text-accent">
          ← Back to approval queue
        </Link>
      </AppShell>
    );
  }

  async function sendDecision(outcome: "Approved" | "Rejected") {
    setSaving(true);
    const payload = {
      id,
      reference: expense!.reference,
      decision: outcome,
      comment,
      decidedAt: new Date().toISOString(),
    };
    try {
      if (UPDATE_WEBHOOK && !UPDATE_WEBHOOK.startsWith("YOUR_MAKE")) {
        await fetch(UPDATE_WEBHOOK, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        console.info("Update webhook not configured — payload:", payload);
      }
    } catch (err) {
      console.error("Failed to send decision", err);
    }
    setSaving(false);
    setDone(outcome);
    setTimeout(() => navigate({ to: "/manager" }), 1200);
  }

  return (
    <AppShell title={expense.title} subtitle={`Reference ${expense.reference}`}>
      <Link
        to="/manager"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to approval queue
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={done ?? expense.status} />
            <AiBadge recommendation={expense.aiRecommendation} />
            {expense.amount >= APPROVAL_THRESHOLD && <HighBadge />}
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Detail label="Submitter" value={expense.fullName} />
            <Detail label="Department" value={expense.department} />
            <Detail label="Amount" value={formatNaira(expense.amount)} />
            <Detail label="Category" value={expense.category} />
            <Detail label="Date" value={expense.date} />
            <Detail label="Receipt" value={expense.receiptName ?? "No receipt attached"} />
            <div className="sm:col-span-2">
              <Detail label="Description" value={expense.description} />
            </div>
          </dl>

          <div className="mt-6 rounded-lg border border-border bg-secondary/60 p-5">
            <h2 className="text-sm font-semibold text-foreground">AI analysis</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail label="Category detected" value={expense.categoryDetected} />
              <Detail label="Policy flag" value={expense.policyFlag} />
              <Detail label="Recommendation" value={expense.aiRecommendation} />
              <div className="sm:col-span-2">
                <Detail label="AI summary" value={expense.aiSummary} />
              </div>
            </dl>
          </div>
        </section>

        <section className="h-fit rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-card-foreground">Manager decision</h2>
          {decision && !done ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Pre-selected action: {decision === "approve" ? "Approve" : "Reject"}
            </p>
          ) : null}
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Manager comment
            </span>
            <textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note for the employee…"
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          {done ? (
            <p className="mt-4 rounded-md bg-secondary px-4 py-3 text-sm font-medium text-foreground">
              Expense {done.toLowerCase()}. Returning to the queue…
            </p>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                disabled={saving}
                onClick={() => sendDecision("Approved")}
                className="flex-1 rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                disabled={saving}
                onClick={() => sendDecision("Rejected")}
                className="flex-1 rounded-md bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
