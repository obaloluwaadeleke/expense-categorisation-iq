import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AdminDashboard } from "@/components/expense/AdminDashboard";
import { useRequireRole } from "@/hooks/useAuth";
import { listExpenseCategories, listExpenses } from "@/lib/expenses.functions";

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
  const auth = useRequireRole(["admin"]);
  const fetchExpenses = useServerFn(listExpenses);
  const fetchCategories = useServerFn(listExpenseCategories);

  const expensesQuery = useQuery({
    queryKey: ["expenses", "all"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchExpenses({ data: undefined }),
  });

  // Separate query: categories come from Airtable, which is slower and can
  // fail independently — the rest of the dashboard never waits on it.
  const categoriesQuery = useQuery({
    queryKey: ["expenses", "categories"],
    enabled: Boolean(auth.session),
    queryFn: () => fetchCategories({ data: undefined }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <AdminDashboard
      expenses={expensesQuery.data?.expenses ?? []}
      // isPending (not isLoading) stays true while the session is still being
      // restored, so empty states never flash before the data arrives.
      isLoading={expensesQuery.isPending}
      isError={expensesQuery.isError}
      categories={categoriesQuery.data?.categories}
      categoriesStatus={
        categoriesQuery.isError ? "error" : categoriesQuery.data ? "ready" : "loading"
      }
    />
  );
}
