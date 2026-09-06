// ---------------------------------------------------------------------------
// AIRTABLE CONFIGURATION
// Change these two constants to point ExpenseIQ at a different Airtable base
// or table. Leave either one empty to fall back to the built-in sample data.
// ---------------------------------------------------------------------------
export const AIRTABLE_BASE_ID = "appNizkNooSqZCFEj";
export const AIRTABLE_EXPENSES_TABLE = "Expense";

// Airtable column names used by the app. Rename here if the base changes.
export const AIRTABLE_FIELDS = {
  employeeName: "Employee Name",
  employeeEmail: "Employee Email",
  department: "Department",
  expenseDate: "Expense Date",
  vendor: "Vendor",
  amount: "Amount",
  purpose: "Purpose",
  paymentMethod: "Payment Method",
  project: "Project/Client",
  additionalNotes: "Additional Notes",
  receiptLink: "Receipt Link",
  receiptMissing: "Receipt Missing",
  aiCategory: "AI Category",
  aiSummary: "AI Summary",
  aiSubcategory: "AI Subcategory",
  duplicateRisk: "Duplicate Risk",
  aiReviewerNote: "AI Reviewer Note",
  approvalRequired: "Approval Required",
  status: "Status",
  approval: "Approval",
  approvedAt: "Approved At",
  managerNotes: "Notes",
} as const;

export const AIRTABLE_CONFIGURED =
  AIRTABLE_BASE_ID.trim().length > 0 && AIRTABLE_EXPENSES_TABLE.trim().length > 0;
