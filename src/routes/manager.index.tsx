import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/expense/AppShell";
import { AiBadge, HighBadge } from "@/components/expense/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/useAuth";
import { decideExpense, listExpenses } from "@/lib/expenses.functions";
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
  const sendDecision = useServerFn(decideExpense);
  const queryClient = useQueryClient();

  const decideMutation = useMutation({
    mutationFn: (input: {
      id: string;
      decision: "Approved" | "Rejected" | "Needs Clarification";
    }) => sendDecision({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", "all"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchExpenses({ data: undefined }),
  });

  const pending = (expensesQuery.data?.expenses ?? []).filter((e) => e.status === "Pending");

  return (
    <AppShell
      title="Approval queue"
      subtitle={
        expensesQuery.isLoading
          ? "Loading claims…"
          : `${pending.length} pending claims awaiting your decision.`
      }
    >
      {decideMutation.isError ? (
        <p className="mb-4 rounded-md bg-secondary px-4 py-3 text-sm text-destructive">
          We couldn't save that decision. Please try again.
        </p>
      ) : null}

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

      <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-5">
        {pending.map((e) => (
          <article
            key={e.id}
            className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-card sm:p-6"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold text-card-foreground">{e.title}</h2>
                <p className="mt-0.5 break-words text-sm text-muted-foreground">
                  {e.fullName} · {e.department || "—"}
                </p>
              </div>
              {e.amount >= APPROVAL_THRESHOLD && <HighBadge />}
            </div>

            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              <span className="shrink-0 text-lg font-semibold text-foreground">
                {formatNaira(e.amount)}
              </span>
              <span className="text-muted-foreground">{e.category}</span>
              <span className="text-muted-foreground">{e.date}</span>
              <AiBadge recommendation={e.aiRecommendation ?? "Review"} />
            </div>

            <p className="mt-4 break-words rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {e.aiSummary ?? e.description ?? "No AI summary available yet."}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate({ id: e.id, decision: "Approved" })}
                className="h-11 w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                Approve
              </Button>
              <Button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() =>
                  decideMutation.mutate({ id: e.id, decision: "Needs Clarification" })
                }
                className="h-11 w-full bg-pending font-semibold text-pending-foreground hover:bg-pending/80"
              >
                Needs Clarification
              </Button>
              <Button
                type="button"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate({ id: e.id, decision: "Rejected" })}
                variant="destructive"
                className="h-11 w-full font-semibold"
              >
                Declined
              </Button>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/manager/$id" params={{ id: e.id }}>
                  View Full
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
