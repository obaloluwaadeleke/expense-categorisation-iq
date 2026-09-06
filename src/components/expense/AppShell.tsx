import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
              IQ
            </span>
            <span className="text-lg font-semibold tracking-tight">ExpenseIQ</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/employee"
              className="rounded-md px-3 py-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
              activeProps={{ className: "bg-white/15 opacity-100" }}
            >
              Employee
            </Link>
            {canReview ? (
              <Link
                to="/manager"
                className="rounded-md px-3 py-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
                activeProps={{ className: "bg-white/15 opacity-100" }}
              >
                Manager
              </Link>
            ) : null}
            {role === "admin" ? (
              <Link
                to="/admin"
                className="rounded-md px-3 py-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
                activeProps={{ className: "bg-white/15 opacity-100" }}
              >
                Admin
              </Link>
            ) : null}

            {user ? (
              <span className="ml-2 flex items-center gap-2 border-l border-white/20 pl-3">
                <span className="hidden text-xs opacity-80 sm:inline">
                  {user.email}
                  {role ? ` · ${role}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium transition hover:bg-white/25"
                >
                  Sign out
                </button>
              </span>
            ) : (
              <Link
                to="/auth"
                className="ml-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
