import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FilePlus2,
  Percent,
  Search,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/expense/AppShell";
import { StatusBadge } from "@/components/expense/StatusBadge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPROVAL_THRESHOLD,
  formatNaira,
  needsManagerDecision,
  type Expense,
  type Status,
} from "@/lib/expense-data";

// Department slices beyond the five chart tokens are grouped into "Other".
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const OTHER_COLOR = "var(--muted-foreground)";

// Ranked bar lists show this many rows; the rest fold into "Other".
const MAX_RANKED_ROWS = 6;

// Status bars reuse the app's reserved status tokens and always carry a text
// label, so state is never conveyed by colour alone.
const STATUS_ORDER: { status: Status; color: string }[] = [
  { status: "Pending", color: "var(--pending-foreground)" },
  { status: "Needs Clarification", color: "var(--pending-foreground)" },
  { status: "Approved", color: "var(--approved-foreground)" },
  { status: "Rejected", color: "var(--rejected-foreground)" },
];

type BarRow = { label: string; value: number; display: string; color?: string };

function rankByAmount(expenses: Expense[], keyOf: (e: Expense) => string): BarRow[] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(keyOf(e), (totals.get(keyOf(e)) ?? 0) + e.amount);
  const rows = [...totals.entries()].filter(([, total]) => total > 0).sort((a, b) => b[1] - a[1]);
  const top = rows.slice(0, MAX_RANKED_ROWS);
  const rest = rows.slice(MAX_RANKED_ROWS).reduce((a, [, total]) => a + total, 0);
  return [...top, ...(rest ? ([["Other", rest]] as [string, number][]) : [])].map(
    ([label, value]) => ({ label, value, display: formatNaira(value) }),
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatNairaCompact(amount: number) {
  return (
    "₦" +
    new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(amount)
  );
}

export function AdminDashboard({
  expenses,
  isLoading,
  isError,
  categories,
  categoriesStatus,
}: {
  expenses: Expense[];
  isLoading: boolean;
  isError: boolean;
  /** reference -> AI category, read from Airtable (see listExpenseCategories). */
  categories?: Record<string, string> | undefined;
  categoriesStatus: "loading" | "ready" | "error";
}) {
  const [query, setQuery] = useState("");

  // Chart draw-in animations are short, and skipped entirely for reduced motion.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Time-of-day greeting is set after mount so server and client markup match.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = monthKey(now);
    const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const spendIn = (key: string) =>
      expenses.filter((e) => e.date.startsWith(key)).reduce((a, e) => a + e.amount, 0);
    // Only claims that actually wait on a manager (see needsManagerDecision).
    const pending = expenses.filter(needsManagerDecision);
    const approved = expenses.filter((e) => e.status === "Approved");
    const rejected = expenses.filter((e) => e.status === "Rejected");
    const decided = approved.length + rejected.length;
    const thisMonthSpend = spendIn(thisMonth);
    const lastMonthSpend = spendIn(lastMonth);
    return {
      total: expenses.reduce((a, e) => a + e.amount, 0),
      thisMonthSpend,
      // null when there's nothing to compare against, so we never show "+∞%".
      monthChange: lastMonthSpend
        ? Math.round(((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100)
        : null,
      pending,
      pendingAmount: pending.reduce((a, e) => a + e.amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((a, e) => a + e.amount, 0),
      rejectedCount: rejected.length,
      approvalRate: decided ? Math.round((approved.length / decided) * 100) : 0,
    };
  }, [expenses]);

  const byMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = monthKey(d);
      return {
        label: d.toLocaleDateString("en-NG", { month: "short" }),
        total: expenses.filter((e) => e.date.startsWith(key)).reduce((a, e) => a + e.amount, 0),
      };
    });
  }, [expenses]);

  // Department, not category: the expenses table has no category column (the
  // AI category lives in Airtable), and Expense.category is the payment method.
  const byDepartment = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const key = e.department || "Unassigned";
      totals.set(key, (totals.get(key) ?? 0) + e.amount);
    }
    const rows = [...totals.entries()]
      .map(([department, total]) => ({ department, total }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    const top = rows
      .slice(0, SLICE_COLORS.length)
      .map((r, i) => ({ ...r, color: SLICE_COLORS[i] }));
    const rest = rows.slice(SLICE_COLORS.length).reduce((a, r) => a + r.total, 0);
    const slices = rest ? [...top, { department: "Other", total: rest, color: OTHER_COLOR }] : top;
    const sum = slices.reduce((a, r) => a + r.total, 0) || 1;
    return slices.map((r) => ({ ...r, pct: Math.round((r.total / sum) * 100) }));
  }, [expenses]);

  const byCategory = useMemo(
    () => rankByAmount(expenses, (e) => categories?.[e.reference] ?? "Not yet categorised"),
    [expenses, categories],
  );

  const byPaymentMethod = useMemo(
    () => rankByAmount(expenses, (e) => e.paymentMethod || "Not specified"),
    [expenses],
  );

  const byStatus = useMemo<BarRow[]>(
    () =>
      STATUS_ORDER.map(({ status, color }) => {
        const rows = expenses.filter((e) => e.status === status);
        const amount = rows.reduce((a, e) => a + e.amount, 0);
        return {
          label: status,
          value: rows.length,
          display: `${rows.length} · ${formatNaira(amount)}`,
          color,
        };
      }),
    [expenses],
  );

  // Rolling 30 days rather than "this month", which would be nearly empty in
  // the first days of every month. Keys are local dates, matching e.date.
  const daily = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i);
      const key = `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
        total: expenses.filter((e) => e.date === key).reduce((a, e) => a + e.amount, 0),
      };
    });
    return { days, total: days.reduce((a, d) => a + d.total, 0) };
  }, [expenses]);

  const aiFlagged = stats.pending.filter((e) => e.aiRecommendation).slice(0, 3);
  const highValue = stats.pending;

  const filtered = useMemo(
    () =>
      expenses
        .filter((e) =>
          [e.title, e.fullName, e.department, e.vendor, e.status, e.reference]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, query],
  );

  const exportRecords = () => window.alert("Export coming soon.");

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading company-wide records…"
            : isError
              ? "Couldn't load expense records. Refresh to try again."
              : "Here's what's happening with company expenses today."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 xl:col-start-1 xl:grid-cols-2 2xl:grid-cols-4">
          <Stat
            icon={<Wallet className="h-4 w-4" />}
            label="Total spend"
            loading={isLoading}
            value={formatNaira(stats.total)}
            footnote={<MonthChange change={stats.monthChange} amount={stats.thisMonthSpend} />}
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Awaiting approval"
            loading={isLoading}
            value={String(stats.pending.length)}
            tone="pending"
            footnote={`${formatNaira(stats.pendingAmount)} · claims of ${formatNaira(APPROVAL_THRESHOLD)}+`}
          />
          <Stat
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Approved claims"
            loading={isLoading}
            value={String(stats.approvedCount)}
            tone="approved"
            footnote={`${formatNaira(stats.approvedAmount)} approved`}
          />
          <Stat
            icon={<Percent className="h-4 w-4" />}
            label="Approval rate"
            loading={isLoading}
            value={`${stats.approvalRate}%`}
            footnote={`${stats.approvedCount} approved · ${stats.rejectedCount} rejected`}
          />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-5 xl:col-start-1">
          <Panel title="Spend overview" subtitle="Last 6 months" className="lg:col-span-3">
            {isLoading ? (
              <Skeleton className="mt-4 h-56 w-full" />
            ) : (
              <ChartContainer
                config={{ total: { label: "Spend", color: "var(--chart-1)" } }}
                className="mt-4 aspect-auto h-56 w-full"
              >
                <BarChart data={byMonth} margin={{ left: 0, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => formatNairaCompact(v)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => <span>{formatNaira(Number(value))}</span>}
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={animate}
                    animationDuration={400}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </Panel>

          <Panel title="Spend by department" className="lg:col-span-2">
            {isLoading ? (
              <Skeleton className="mx-auto mt-2 h-44 w-44 rounded-full" />
            ) : byDepartment.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No spend recorded yet.</p>
            ) : (
              <>
                <div className="relative mx-auto mt-2 h-44 w-44">
                  <ChartContainer config={{}} className="aspect-square h-44 w-44">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            hideLabel
                            nameKey="department"
                            formatter={(value, name) => (
                              <span>
                                {name}: {formatNaira(Number(value))}
                              </span>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={byDepartment}
                        dataKey="total"
                        nameKey="department"
                        innerRadius={52}
                        outerRadius={80}
                        strokeWidth={2}
                        isAnimationActive={animate}
                        animationBegin={0}
                        animationDuration={500}
                      >
                        {byDepartment.map((r) => (
                          <Cell key={r.department} fill={r.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {formatNairaCompact(stats.total)}
                    </span>
                    <span className="text-xs text-muted-foreground">total</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {byDepartment.map((r) => (
                    <li key={r.department} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {r.department}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{r.pct}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-5 xl:col-start-1">
          <Panel
            title="Daily spend"
            subtitle={`Last 30 days · ${formatNaira(daily.total)}`}
            className="lg:col-span-3"
          >
            {isLoading ? (
              <Skeleton className="mt-4 h-48 w-full" />
            ) : (
              <ChartContainer
                config={{ total: { label: "Spend", color: "var(--chart-1)" } }}
                className="mt-4 aspect-auto h-48 w-full"
              >
                <AreaChart data={daily.days} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={16}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => formatNairaCompact(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => <span>{formatNaira(Number(value))}</span>}
                      />
                    }
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="var(--color-total)"
                    fillOpacity={0.15}
                    isAnimationActive={animate}
                    animationDuration={500}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </Panel>

          <Panel title="Claims by status" subtitle="Count · amount" className="lg:col-span-2">
            <BarList rows={byStatus} loading={isLoading} />
          </Panel>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2 xl:col-start-1">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Spend by category
              </span>
            }
            subtitle="AI category · Airtable"
          >
            {categoriesStatus === "error" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Couldn&apos;t load categories from Airtable. The rest of the dashboard is
                unaffected.
              </p>
            ) : (
              <BarList
                rows={byCategory}
                loading={isLoading || categoriesStatus === "loading"}
                color="var(--chart-1)"
              />
            )}
          </Panel>

          <Panel title="Spend by payment method">
            <BarList rows={byPaymentMethod} loading={isLoading} color="var(--chart-1)" />
          </Panel>
        </div>

        <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2 xl:col-start-2 xl:row-span-5 xl:row-start-1 xl:grid-cols-1">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> AI reviewer notes
              </span>
            }
          >
            {aiFlagged.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No AI notes on pending claims right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {aiFlagged.map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/manager/$id"
                      params={{ id: e.id }}
                      className="block rounded-md border border-border p-3 transition hover:border-accent"
                    >
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-foreground">{e.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatNaira(e.amount)}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {e.aiRecommendation}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-pending-foreground" /> High-value claims
              </span>
            }
          >
            <p className="mt-3 text-sm text-muted-foreground">
              {highValue.length === 0
                ? `No pending claims of ${formatNaira(APPROVAL_THRESHOLD)} or more.`
                : `${highValue.length} pending ${highValue.length === 1 ? "claim" : "claims"} of ${formatNaira(APPROVAL_THRESHOLD)}+ need manager approval.`}
            </p>
            {highValue.length > 0 ? (
              <Button asChild variant="outline" className="mt-3 h-11 w-full">
                <Link to="/manager">View queue</Link>
              </Button>
            ) : null}
          </Panel>

          <Panel title="Quick actions" className="sm:col-span-2 xl:col-span-1">
            <div className="mt-2 flex flex-col">
              <QuickAction to="/employee" icon={<FilePlus2 className="h-4 w-4" />}>
                File an expense
              </QuickAction>
              <QuickAction to="/manager" icon={<ClipboardCheck className="h-4 w-4" />}>
                Review approval queue
              </QuickAction>
              <button
                type="button"
                onClick={exportRecords}
                className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm text-foreground transition hover:bg-secondary"
              >
                <span className="text-accent">
                  <Download className="h-4 w-4" />
                </span>
                Export records
              </button>
            </div>
          </Panel>
        </div>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6 xl:col-start-1">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-card-foreground">Recent expenses</h2>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search expenses, vendors, references…"
                  aria-label="Search expenses"
                  className="h-11 w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:w-64 sm:text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={exportRecords}
                variant="outline"
                className="h-11 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          <div className="relative mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border bg-secondary/50">
                  <th className="py-3 pl-3 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Submitter</th>
                  <th className="py-2 pr-3 font-medium">Vendor / purpose</th>
                  <th className="py-2 pr-3 font-medium">Department</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pl-3 pr-3 whitespace-nowrap text-muted-foreground">
                      {e.date}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block">{e.fullName}</span>
                      <span className="font-mono text-xs text-muted-foreground">{e.reference}</span>
                    </td>
                    <td className="py-3 pr-3 font-medium text-foreground">{e.title}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{e.department}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatNaira(e.amount)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <RowAction expense={e} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {query ? `No records match “${query}”.` : "No expense records yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  footnote,
  tone,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  footnote: ReactNode;
  tone?: "approved" | "pending";
  loading: boolean;
}) {
  const iconTone =
    tone === "approved"
      ? "bg-approved text-approved-foreground"
      : tone === "pending"
        ? "bg-pending text-pending-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconTone}`}
        >
          {icon}
        </span>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-2 h-3 w-24" />
        </>
      ) : (
        <>
          <p className="mt-3 break-words text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{footnote}</p>
        </>
      )}
    </div>
  );
}

function MonthChange({ change, amount }: { change: number | null; amount: number }) {
  if (change === null) return <>{formatNaira(amount)} this month</>;
  const Arrow = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Arrow className="h-3.5 w-3.5" aria-hidden />
      {Math.abs(change)}% {change >= 0 ? "more" : "less"} than last month
    </span>
  );
}

function QuickAction({
  to,
  icon,
  children,
}: {
  to: "/employee" | "/manager";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm text-foreground transition hover:bg-secondary"
    >
      <span className="text-accent">{icon}</span>
      {children}
    </Link>
  );
}

function RowAction({ expense }: { expense: Expense }) {
  const label = needsManagerDecision(expense)
    ? "Review"
    : expense.status === "Needs Clarification"
      ? "Clarify"
      : "View";
  return (
    <Button
      asChild
      size="sm"
      variant={needsManagerDecision(expense) ? "default" : "outline"}
      className="h-9"
    >
      <Link to="/manager/$id" params={{ id: expense.id }}>
        {label}
      </Link>
    </Button>
  );
}

// Ranked horizontal bars in plain HTML: no chart library, so they render as
// soon as the data does. Every bar is direct-labelled; value text stays in
// text tokens and the bar colour only marks identity.
function BarList({ rows, loading, color }: { rows: BarRow[]; loading: boolean; color?: string }) {
  if (loading) {
    return (
      <div className="mt-4 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (rows.every((r) => r.value === 0)) {
    return <p className="mt-4 text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-sm">
            <span className="truncate text-foreground">{r.label}</span>
            <span className="shrink-0 text-muted-foreground">{r.display}</span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.max((r.value / max) * 100, r.value ? 2 : 0)}%`,
                backgroundColor: r.color ?? color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
