import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { AiBadge, HighBadge } from "@/components/expense/StatusBadge";
import {
  APPROVAL_THRESHOLD,
  MOCK_EXPENSES,
  YOUR_MAKE_READ_WEBHOOK,
  formatNaira,
} from "@/lib/expense-data";

// Configure in src/lib/expense-data.ts
const READ_WEBHOOK = YOUR_MAKE_READ_WEBHOOK;

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
    ],
  }),
  component: ManagerQueue,
});

function ManagerQueue() {
  // Mock data, conceptually filtered to Pending. Replace with READ_WEBHOOK fetch.
  const pending = useMemo(() => MOCK_EXPENSES.filter((e) => e.status === "Pending"), []);

  return (
    <AppShell
      title="Approval queue"
      subtitle={`${pending.length} pending claims awaiting your decision.${
        READ_WEBHOOK.startsWith("YOUR_MAKE") ? " Showing mock data." : ""
      }`}
    >
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
                  {e.fullName} · {e.department}
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
              <AiBadge recommendation={e.aiRecommendation} />
            </div>

            <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {e.aiSummary}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/manager/$id"
                params={{ id: e.id }}
                search={{ decision: "approve" }}
                className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                Approve
              </Link>
              <Link
                to="/manager/$id"
                params={{ id: e.id }}
                search={{ decision: "reject" }}
                className="rounded-md bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
              >
                Reject
              </Link>
              <Link
                to="/manager/$id"
                params={{ id: e.id }}
                className="rounded-md border border-input px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                View full
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
