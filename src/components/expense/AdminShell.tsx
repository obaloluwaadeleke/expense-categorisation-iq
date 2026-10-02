import { Link } from "@tanstack/react-router";
import { ClipboardCheck, FilePlus2, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

// Sidebar layout used only by the admin dashboard. Every other page keeps the
// top-header AppShell; colours come from the same --primary / --accent tokens.
export function AdminShell({
  pendingCount,
  children,
}: {
  pendingCount: number;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen bg-primary text-primary-foreground lg:block">
        <SidebarContent pendingCount={pendingCount} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground lg:hidden">
        <Brand />
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMenuOpen(true)}
          className="h-11 w-11 p-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 border-0 bg-primary p-0 text-primary-foreground [&>button]:text-primary-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent pendingCount={pendingCount} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
        IQ
      </span>
      <span className="truncate text-lg font-semibold tracking-tight">ExpenseIQ</span>
    </Link>
  );
}

const navItem =
  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm opacity-80 transition hover:bg-primary-foreground/10 hover:opacity-100";

function SidebarContent({
  pendingCount,
  onNavigate,
}: {
  pendingCount: number;
  onNavigate?: () => void;
}) {
  const { user, role, signOut } = useAuth();

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Brand />

      <nav className="mt-8 flex flex-col gap-1" aria-label="Admin">
        <Link
          to="/admin"
          onClick={onNavigate}
          className={navItem}
          activeProps={{ className: "bg-primary-foreground/15 font-medium opacity-100" }}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" /> Dashboard
        </Link>
        <Link to="/manager" onClick={onNavigate} className={navItem}>
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Approval queue</span>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              {pendingCount}
            </span>
          ) : null}
        </Link>
        <Link to="/employee" onClick={onNavigate} className={navItem}>
          <FilePlus2 className="h-4 w-4 shrink-0" /> File an expense
        </Link>
      </nav>

      <div className="mt-auto border-t border-primary-foreground/15 pt-4">
        {user ? (
          <p className="truncate text-xs opacity-80">
            {user.email}
            {role ? ` · ${role}` : ""}
          </p>
        ) : null}
        <button type="button" onClick={() => signOut()} className={`${navItem} mt-2 w-full`}>
          <LogOut className="h-4 w-4 shrink-0" /> Sign out
        </button>
      </div>
    </div>
  );
}
