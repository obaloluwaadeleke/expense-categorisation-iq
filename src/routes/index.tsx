import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Lock, ShieldCheck, Sparkles } from "lucide-react";

import financePattern from "@/assets/finance-pattern.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Welcome to ExpenseIQ — AI Business Expense Management" },
      {
        name: "description",
        content:
          "ExpenseIQ lets staff file business expenses in Naira in minutes, then routes each claim through AI checks and manager approval.",
      },
      { property: "og:title", content: "Welcome to ExpenseIQ" },
      {
        property: "og:description",
        content:
          "File business expenses in Naira and route each claim through AI checks and manager approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <img
        src={financePattern}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1280}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background"
      />

      <div className="relative mx-auto max-w-4xl px-4 py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" /> AI-assisted expense review
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Welcome to ExpenseIQ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            ExpenseIQ is a business expense management system for Naira spending. Staff file a
            claim in a couple of minutes — vendor, amount, purpose and receipt — and every
            submission is checked automatically, then sent to a manager for a clear approve,
            decline or clarify decision. Managers and admins get the full record, AI notes,
            spend totals and approval rates in one place.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Link
            to="/employee"
            className="group rounded-xl border border-border bg-card/90 p-7 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:border-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-card-foreground">Employee</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              File your expense here. No login needed — fill in the form, attach your receipt
              and get an instant reference number.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              File an expense <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            to="/auth"
            className="group rounded-xl border border-border bg-card/90 p-7 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:border-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-card-foreground">Manager / Admin</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to review the approval queue, approve, decline or ask for clarification,
              and see company-wide spend and reporting.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              Sign in <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Claims of ₦100,000 and above are routed for
          manager approval automatically.
        </p>
      </div>
    </div>
  );
}
