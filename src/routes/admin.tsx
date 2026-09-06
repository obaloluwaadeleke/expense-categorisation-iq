import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { StatusBadge } from "@/components/expense/StatusBadge";
import { useRequireRole } from "@/hooks/useAuth";
import { listExpenses } from "@/lib/expenses.functions";
import { formatNaira } from "@/lib/expense-data";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Spend Dashboard — ExpenseIQ Admin" },
      {
        name: "description",
        content:
          "Track total spend, approvals, rejections, pending claims, category breakdown and approval rate across all expense records.",
      },
      { property: "og:title", content: "Spend Dashboard — ExpenseIQ Admin" },
      {
        property: "og:description",
        content:
          "Total spend, approval rate, category breakdown and a searchable table of all expense records.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [query, setQuery] = useState("");
  const auth = useRequireRole(["admin"]);
  const fetchExpenses = useServerFn(listExpenses);

  const expensesQuery = useQuery({
    queryKey: ["expenses", "all"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchExpenses({ data: undefined }),
  });

  const expenses = useMemo(() => expensesQuery.data?.expenses ?? [], [expensesQuery.data]);
  const usingSampleData = expensesQuery.data?.source === "mock";

  const stats = useMemo(() => {
    const sum = (s: string) =>
      expenses.filter((e) => e.status === s).reduce((a, e) => a + e.amount, 0);
    const total = expenses.reduce((a, e) => a + e.amount, 0);
    const decided = expenses.filter((e) => e.status !== "Pending").length;
    const approvedCount = expenses.filter((e) => e.status === "Approved").length;
    return {
      total,
      approved: sum("Approved"),
      rejected: sum("Rejected"),
      pending: sum("Pending"),
      approvalRate: decided ? Math.round((approvedCount / decided) * 100) : 0,
    };
  }, [expenses]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const key = e.category || "Uncategorised";
      totals.set(key, (totals.get(key) ?? 0) + e.amount);
    }
    const rows = [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .filter((r) => r.total > 0);
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows
      .sort((a, b) => b.total - a.total)
      .map((r) => ({ ...r, pct: Math.round((r.total / max) * 100) }));
  }, [expenses]);

  const filtered = expenses.filter((e) =>
    [e.title, e.fullName, e.department, e.category, e.status, e.reference]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <AppShell
      title="Admin dashboard"
      subtitle={
        expensesQuery.isLoading
          ? "Loading company-wide records…"
          : `Company-wide expense overview.${usingSampleData ? " Showing sample data." : ""}`
      }
    >

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total spend" value={formatNaira(stats.total)} />
        <Stat label="Total approved" value={formatNaira(stats.approved)} tone="approved" />
        <Stat label="Total rejected" value={formatNaira(stats.rejected)} tone="rejected" />
        <Stat label="Total pending" value={formatNaira(stats.pending)} tone="pending" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-card-foreground">
            Spend by category
          </h2>
          <div className="mt-5 space-y-4">
            {byCategory.map((r) => (
              <div key={r.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.category}</span>
                  <span className="text-muted-foreground">{formatNaira(r.total)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-2.5 rounded-full bg-accent"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-base font-semibold text-card-foreground">Approval rate</h2>
          <p className="mt-4 text-5xl font-semibold text-accent">{stats.approvalRate}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            of decided claims were approved
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-card-foreground">All records</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search records…"
                className="w-56 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="button"
              onClick={() => window.alert("Export coming soon.")}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Submitter</th>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                    {e.reference}
                  </td>
                  <td className="py-3 pr-3">{e.fullName}</td>
                  <td className="py-3 pr-3 font-medium text-foreground">{e.title}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{e.category}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{formatNaira(e.amount)}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">
                    {e.date}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No records match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "approved" | "rejected" | "pending";
}) {
  const accent =
    tone === "approved"
      ? "text-approved-foreground"
      : tone === "rejected"
        ? "text-rejected-foreground"
        : tone === "pending"
          ? "text-pending-foreground"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
