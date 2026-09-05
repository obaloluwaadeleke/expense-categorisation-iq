import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ClipboardCheck, FileText, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpenseIQ — AI Business Expense Management" },
      {
        name: "description",
        content:
          "Submit, review and analyse business expenses in Naira with AI recommendations across Employee, Manager and Admin workspaces.",
      },
      { property: "og:title", content: "ExpenseIQ — AI Business Expense Management" },
      {
        property: "og:description",
        content:
          "Submit, review and analyse business expenses in Naira with AI recommendations across Employee, Manager and Admin workspaces.",
      },
    ],
  }),
  component: Home,
});

const roles = [
  {
    to: "/employee" as const,
    icon: FileText,
    name: "Employee",
    desc: "Submit a new expense claim and track the status of your submissions.",
  },
  {
    to: "/manager" as const,
    icon: ClipboardCheck,
    name: "Manager",
    desc: "Review the approval queue with AI recommendations and approve or reject claims.",
  },
  {
    to: "/admin" as const,
    icon: BarChart3,
    name: "Admin",
    desc: "Monitor total spend, category breakdown, approval rate and all records.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> AI-assisted expense review
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">ExpenseIQ</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base opacity-80">
            A complete business expense management system — submissions, approvals and
            analytics in Nigerian Naira, with AI policy checks on every claim.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-5xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <Link
              key={r.name}
              to={r.to}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-accent"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <r.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-card-foreground">{r.name}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-accent">
                Enter {r.name} area →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Claims of ₦100,000 and above are routed for
          manager approval automatically.
        </p>
      </div>
    </div>
  );
}
