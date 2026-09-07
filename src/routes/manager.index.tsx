import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/expense/AppShell";
import { AiBadge, HighBadge } from "@/components/expense/StatusBadge";
import { useRequireRole } from "@/hooks/useAuth";
import { listExpenses } from "@/lib/expenses.functions";
import { APPROVAL_THRESHOLD, formatNaira } from "@/lib/expense-data";

export const Route = createFileRoute("/manager/")({
  head: () => ({
    meta: [
      { title: "Approval Queue — ExpenseIQ Manager" },
      {
        name: "description",
        content:
          "Review pending expense claims with AI recommendations, policy flags and one-click approve or reject decisions.",
      },
      { property: "og:title", content: "Approval Queue — ExpenseIQ Manager" },
      {
        property: "og:description",
        content:
          "Review pending expense claims with AI recommendations and approve or reject them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagerQueue,
});

function ManagerQueue() {
  const auth = useRequireRole(["manager", "admin"]);
  const fetchExpenses = useServerFn(listExpenses);

  const expensesQuery = useQuery({
    queryKey: ["expenses", "all"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchExpenses({ data: undefined }),
  });

  const pending = (expensesQuery.data?.expenses ?? []).filter((e) => e.status === "Pending");
  const usingSampleData = expensesQuery.data?.source === "mock";

  return (
    <AppShell
      title="Approval queue"
      subtitle={
        expensesQuery.isLoading
          ? "Loading claims…"
          : `${pending.length} pending claims awaiting your decision.${
              usingSampleData ? " Showing sample data." : ""
            }`
      }
    >
      {expensesQuery.isError ? (
        <p className="rounded-md bg-secondary px-4 py-3 text-sm text-destructive">
          We couldn't load the claims right now. Please refresh and try again.
        </p>
      ) : null}

      {!expensesQuery.isLoading && pending.length === 0 ? (
        <p className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Nothing waiting for a decision right now.
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {pending.map((e) => (
          <article
            key={e.id}
            className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">{e.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {e.fullName} · {e.department || "—"}
                </p>
              </div>
              {e.amount >= APPROVAL_THRESHOLD && <HighBadge />}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-lg font-semibold text-foreground">
                {formatNaira(e.amount)}
              </span>
              <span className="text-muted-foreground">{e.category}</span>
              <span className="text-muted-foreground">{e.date}</span>
              <AiBadge recommendation={e.aiRecommendation ?? "Review"} />
            </div>

            <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {e.aiSummary ?? e.description ?? "No AI summary available yet."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate({ id: e.id, decision: "Approved" })}
                className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() =>
                  decideMutation.mutate({ id: e.id, decision: "Needs Clarification" })
                }
                className="rounded-md bg-pending px-3.5 py-2 text-sm font-semibold text-pending-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Needs Clarification
              </button>
              <button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate({ id: e.id, decision: "Rejected" })}
                className="rounded-md bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Declined
              </button>
              <Link
                to="/manager/$id"
                params={{ id: e.id }}
                className="rounded-md border border-input px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                View Full
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
