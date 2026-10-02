import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { AiBadge, HighBadge, StatusBadge } from "@/components/expense/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/useAuth";
import { decideExpense, listExpenses } from "@/lib/expenses.functions";
import { APPROVAL_THRESHOLD, formatNaira } from "@/lib/expense-data";

type Decision = "Approved" | "Rejected" | "Needs Clarification";

type Search = { decision?: "approve" | "reject" | "clarify" };

export const Route = createFileRoute("/manager/$id")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search["decision"] === "approve" ||
    search["decision"] === "reject" ||
    search["decision"] === "clarify"
      ? { decision: search["decision"] }
      : {},
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpenseDetail,
});

function ExpenseDetail() {
  const { id } = Route.useParams();
  const { decision } = Route.useSearch();
  const navigate = useNavigate();
  const auth = useRequireRole(["manager", "admin"]);
  const queryClient = useQueryClient();
  const fetchExpenses = useServerFn(listExpenses);
  const sendDecisionFn = useServerFn(decideExpense);

  const expensesQuery = useQuery({
    queryKey: ["expenses", "all"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchExpenses({ data: undefined }),
  });

  const expense = expensesQuery.data?.expenses.find((e) => e.id === id);

  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Decision | null>(null);

  if (expensesQuery.isLoading) {
    return <AppShell title="Loading expense…">{null}</AppShell>;
  }

  if (!expense) {
    return (
      <AppShell title="Expense not found">
        <Link to="/manager" className="text-sm font-medium text-accent">
          ← Back to approval queue
        </Link>
      </AppShell>
    );
  }

  async function sendDecision(outcome: Decision) {
    setSaving(true);
    setError(null);
    try {
      await sendDecisionFn({ data: { id, decision: outcome, comment } });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDone(outcome);
      setTimeout(() => navigate({ to: "/manager" }), 1200);
    } catch (err) {
      console.error("Failed to save decision", err);
      setError(
        `We couldn't save that decision: ${err instanceof Error ? err.message : "please try again."}`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={expense.title} subtitle={`Reference ${expense.reference}`}>
      <Link
        to="/manager"
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to approval queue
      </Link>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6 lg:col-span-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge status={done ?? expense.status} />
            <AiBadge recommendation={expense.aiRecommendation ?? "Review"} />
            {expense.amount >= APPROVAL_THRESHOLD && <HighBadge />}
          </div>

          <dl className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Submitter" value={expense.fullName} />
            <Detail label="Email" value={expense.email ?? "—"} />
            <Detail label="Department" value={expense.department || "—"} />
            <Detail label="Amount" value={formatNaira(expense.amount)} />
            <Detail label="Vendor" value={expense.vendor || "—"} />
            <Detail label="Payment method" value={expense.paymentMethod || "—"} />
            <Detail label="Project / client" value={expense.project || "—"} />
            <Detail label="Date" value={expense.date} />
            <Detail label="Receipt" value={expense.receiptName ?? "No receipt attached"} />
            <div className="sm:col-span-2">
              <Detail label="Purpose" value={expense.description || "—"} />
            </div>
            <div className="sm:col-span-2">
              <Detail label="Additional notes" value={expense.notes || "—"} />
            </div>
          </dl>

          <div className="mt-6 min-w-0 rounded-lg border border-border bg-secondary/60 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">AI analysis</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail label="Category detected" value={expense.categoryDetected ?? "—"} />
              <Detail label="Policy flag" value={expense.policyFlag ?? "No flags recorded"} />
              <Detail label="Recommendation" value={expense.aiRecommendation ?? "Review"} />
              <div className="sm:col-span-2">
                <Detail label="AI summary" value={expense.aiSummary ?? "—"} />
              </div>
            </dl>
          </div>
        </section>

        <section className="h-fit min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
          <h2 className="text-base font-semibold text-card-foreground">Manager decision</h2>
          {decision && !done ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Pre-selected action:{" "}
              {decision === "approve"
                ? "Approve"
                : decision === "clarify"
                  ? "Needs Clarification"
                  : "Declined"}
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
              className="min-h-32 w-full resize-y rounded-md border border-input bg-card px-3 py-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:text-sm"
            />
          </label>

          {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}

          {done ? (
            <p className="mt-4 rounded-md bg-secondary px-4 py-3 text-sm font-medium text-foreground">
              Decision saved: {done}. Returning to the queue…
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                disabled={saving}
                onClick={() => sendDecision("Approved")}
                className="h-11 w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                Approve
              </Button>
              <Button
                disabled={saving}
                onClick={() => sendDecision("Needs Clarification")}
                className="h-11 w-full bg-pending font-semibold text-pending-foreground hover:bg-pending/80"
              >
                Needs Clarification
              </Button>
              <Button
                disabled={saving}
                onClick={() => sendDecision("Rejected")}
                variant="destructive"
                className="h-11 w-full font-semibold"
              >
                Declined
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
