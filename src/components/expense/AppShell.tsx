import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, role, signOut } = useAuth();
  const canReview = role === "manager" || role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-3 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
              IQ
            </span>
            <span className="truncate text-lg font-semibold tracking-tight">ExpenseIQ</span>
          </Link>
          <nav className="col-span-2 flex min-w-0 items-center gap-1 overflow-x-auto pb-1 text-sm sm:col-span-1 sm:justify-self-end sm:overflow-visible sm:pb-0">
            <Link
              to="/employee"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 opacity-80 transition hover:bg-primary-foreground/10 hover:opacity-100"
              activeProps={{ className: "bg-white/15 opacity-100" }}
            >
              Employee
            </Link>
            {canReview ? (
              <Link
                to="/manager"
                className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 opacity-80 transition hover:bg-primary-foreground/10 hover:opacity-100"
                activeProps={{ className: "bg-white/15 opacity-100" }}
              >
                Manager
              </Link>
            ) : null}
            {role === "admin" ? (
              <Link
                to="/admin"
                className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 opacity-80 transition hover:bg-primary-foreground/10 hover:opacity-100"
                activeProps={{ className: "bg-white/15 opacity-100" }}
              >
                Admin
              </Link>
            ) : null}

            {user ? (
              <span className="ml-1 flex shrink-0 items-center gap-2 border-l border-primary-foreground/20 pl-2 sm:ml-2 sm:pl-3">
                <span className="hidden max-w-48 truncate text-xs opacity-80 lg:inline">
                  {user.email}
                  {role ? ` · ${role}` : ""}
                </span>
                <Button
                  type="button"
                  onClick={() => signOut()}
                  variant="secondary"
                  className="h-11 bg-primary-foreground/15 px-3 text-primary-foreground shadow-none hover:bg-primary-foreground/25 hover:text-primary-foreground"
                >
                  Sign out
                </Button>
              </span>
            ) : (
              <Link
                to="/auth"
                className="ml-1 inline-flex min-h-11 shrink-0 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 sm:ml-2"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
