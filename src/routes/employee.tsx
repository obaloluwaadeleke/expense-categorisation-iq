import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/expense/AppShell";
import { StatusBadge } from "@/components/expense/StatusBadge";
import {
  APPROVAL_THRESHOLD,
  CATEGORIES,
  MOCK_EXPENSES,
  YOUR_MAKE_READ_WEBHOOK,
  YOUR_MAKE_WEBHOOK_URL,
  formatNaira,
  generateReference,
  type Category,
} from "@/lib/expense-data";

// Webhooks used by this page (configure in src/lib/expense-data.ts):
//   POST -> YOUR_MAKE_WEBHOOK_URL
//   READ -> YOUR_MAKE_READ_WEBHOOK
const POST_WEBHOOK = YOUR_MAKE_WEBHOOK_URL;
const READ_WEBHOOK = YOUR_MAKE_READ_WEBHOOK;

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Submit an Expense — ExpenseIQ Employee" },
      {
        name: "description",
        content:
          "Submit a business expense claim in Naira with receipt upload and track your past submissions and their approval status.",
      },
      { property: "og:title", content: "Submit an Expense — ExpenseIQ Employee" },
      {
        property: "og:description",
        content:
          "Submit a business expense claim in Naira with receipt upload and track your past submissions.",
      },
    ],
  }),
  component: EmployeePage,
});

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

function EmployeePage() {
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const numericAmount = Number(amount) || 0;
  const needsApproval = numericAmount >= APPROVAL_THRESHOLD;

  // Populated from mock data; swap for a fetch to READ_WEBHOOK when configured.
  const submissions = useMemo(() => MOCK_EXPENSES.slice(0, 5), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ref = generateReference();
    const payload = {
      reference: ref,
      fullName,
      department,
      title,
      amount: numericAmount,
      category,
      date,
      description,
      receiptName: receipt?.name ?? null,
      status: "Pending",
    };

    try {
      if (POST_WEBHOOK && !POST_WEBHOOK.startsWith("YOUR_MAKE")) {
        await fetch(POST_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        console.info("Webhook not configured — payload that would be sent:", payload);
      }
    } catch (err) {
      console.error("Failed to send expense to webhook", err);
    }

    setSubmitting(false);
    setReference(ref);
  }

  function resetForm() {
    setFullName("");
    setDepartment("");
    setTitle("");
    setAmount("");
    setCategory("");
    setDate("");
    setDescription("");
    setReceipt(null);
    setReference(null);
  }

  if (reference) {
    return (
      <AppShell title="Expense submitted">
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-approved">
            <CheckCircle2 className="h-7 w-7 text-approved-foreground" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-card-foreground">
            Submission received
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your expense has been sent for review. Keep this reference number for tracking.
          </p>
          <p className="mt-5 rounded-lg bg-secondary px-4 py-3 font-mono text-lg font-semibold tracking-wide text-foreground">
            {reference}
          </p>
          <button
            onClick={resetForm}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Submit another expense
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Employee workspace"
      subtitle="Submit a new expense claim and track your submissions."
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-3"
        >
          <h2 className="text-base font-semibold text-card-foreground">New expense</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <input
                required
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adaeze Nwosu"
              />
            </Field>
            <Field label="Department">
              <input
                required
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Sales"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Expense Title">
                <input
                  required
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Client visit flight to Abuja"
                />
              </Field>
            </div>
            <Field label="Amount (₦)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <Field label="Category">
              <select
                required
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                required
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Receipt (image or PDF, optional)">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-secondary/50 px-3 py-2 text-sm text-muted-foreground transition hover:border-accent">
                <Upload className="h-4 w-4" />
                <span className="truncate">{receipt ? receipt.name : "Choose file"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  required
                  rows={4}
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                />
              </Field>
            </div>
          </div>

          {needsApproval && (
            <p className="mt-4 rounded-md bg-pending px-4 py-3 text-sm font-medium text-pending-foreground">
              ⚠ This amount requires manager approval.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit expense"}
          </button>
        </form>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-card-foreground">My submissions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reading from mock data{READ_WEBHOOK.startsWith("YOUR_MAKE") ? " (webhook not configured)" : ""}.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Title</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-3 font-medium text-foreground">{s.title}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatNaira(s.amount)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{s.category}</td>
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">
                      {s.date}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
