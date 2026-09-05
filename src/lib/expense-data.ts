// ---------------------------------------------------------------------------
// CONFIGURABLE WEBHOOK ENDPOINTS
// Replace these placeholder strings with your real Make.com webhook URLs.
// ---------------------------------------------------------------------------
export const YOUR_MAKE_WEBHOOK_URL = "YOUR_MAKE_WEBHOOK_URL"; // POST new expense
export const YOUR_MAKE_READ_WEBHOOK = "YOUR_MAKE_READ_WEBHOOK"; // GET expenses
export const YOUR_MAKE_UPDATE_WEBHOOK = "YOUR_MAKE_UPDATE_WEBHOOK"; // PATCH decision

export const APPROVAL_THRESHOLD = 100000;

export const CATEGORIES = [
  "Travel & Transport",
  "Office Supplies",
  "Meals & Entertainment",
  "Accommodation",
  "Training",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = "Pending" | "Approved" | "Rejected";

export interface Expense {
  id: string;
  reference: string;
  fullName: string;
  department: string;
  title: string;
  amount: number;
  category: Category;
  date: string;
  description: string;
  receiptName?: string;
  status: Status;
  aiRecommendation: "Approve" | "Reject" | "Review";
  aiSummary: string;
  categoryDetected: Category;
  policyFlag: string;
  managerComment?: string;
}

export function formatNaira(amount: number) {
  return "₦" + amount.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function generateReference() {
  return (
    "EXP-" +
    new Date().getFullYear() +
    "-" +
    Math.floor(100000 + Math.random() * 900000).toString()
  );
}

// ---------------------------------------------------------------------------
// MOCK DATA — the entire UI runs on this until the webhooks above are wired up.
// ---------------------------------------------------------------------------
export const MOCK_EXPENSES: Expense[] = [
  {
    id: "1",
    reference: "EXP-2026-100241",
    fullName: "Adaeze Nwosu",
    department: "Sales",
    title: "Client visit flight to Abuja",
    amount: 185000,
    category: "Travel & Transport",
    date: "2026-08-28",
    description: "Return economy flight for the Q3 enterprise client pitch in Abuja.",
    receiptName: "flight-receipt.pdf",
    status: "Pending",
    aiRecommendation: "Review",
    aiSummary:
      "Airfare is 22% above the average Lagos–Abuja route spend this quarter, but tied to a confirmed enterprise pitch. Documentation is complete.",
    categoryDetected: "Travel & Transport",
    policyFlag: "Exceeds ₦100,000 single-item threshold",
  },
  {
    id: "2",
    reference: "EXP-2026-100242",
    fullName: "Tunde Bakare",
    department: "Engineering",
    title: "Standing desk and monitor arm",
    amount: 74500,
    category: "Office Supplies",
    date: "2026-08-29",
    description: "Ergonomic equipment approved by the workplace wellness programme.",
    receiptName: "desk-invoice.pdf",
    status: "Pending",
    aiRecommendation: "Approve",
    aiSummary:
      "Within office equipment policy limits, vendor is on the approved supplier list and receipt matches the claimed amount.",
    categoryDetected: "Office Supplies",
    policyFlag: "No policy issues detected",
  },
  {
    id: "3",
    reference: "EXP-2026-100243",
    fullName: "Grace Okonkwo",
    department: "Marketing",
    title: "Team dinner with agency partners",
    amount: 128000,
    category: "Meals & Entertainment",
    date: "2026-08-30",
    description: "Dinner for 9 attendees following the brand campaign workshop.",
    status: "Pending",
    aiRecommendation: "Review",
    aiSummary:
      "Per-head spend of ₦14,222 sits slightly above the ₦12,000 entertainment guideline. No itemised receipt was attached.",
    categoryDetected: "Meals & Entertainment",
    policyFlag: "Missing receipt · Exceeds ₦100,000 threshold",
  },
  {
    id: "4",
    reference: "EXP-2026-100244",
    fullName: "Ibrahim Sule",
    department: "Operations",
    title: "Lagos–Ibadan logistics fuel",
    amount: 46000,
    category: "Travel & Transport",
    date: "2026-08-21",
    description: "Fuel for two delivery runs to the Ibadan distribution hub.",
    receiptName: "fuel-receipt.jpg",
    status: "Approved",
    aiRecommendation: "Approve",
    aiSummary: "Routine logistics cost consistent with prior monthly fuel claims.",
    categoryDetected: "Travel & Transport",
    policyFlag: "No policy issues detected",
    managerComment: "Approved — standard route cost.",
  },
  {
    id: "5",
    reference: "EXP-2026-100245",
    fullName: "Chioma Eze",
    department: "People",
    title: "Leadership training programme",
    amount: 260000,
    category: "Training",
    date: "2026-08-14",
    description: "Two-day management certification for the new team leads cohort.",
    receiptName: "training-invoice.pdf",
    status: "Approved",
    aiRecommendation: "Approve",
    aiSummary:
      "Pre-approved in the annual L&D budget; invoice matches the quoted programme fee.",
    categoryDetected: "Training",
    policyFlag: "Exceeds ₦100,000 single-item threshold",
    managerComment: "Budgeted under L&D FY26.",
  },
  {
    id: "6",
    reference: "EXP-2026-100246",
    fullName: "Samuel Ojo",
    department: "Sales",
    title: "Hotel stay — Port Harcourt",
    amount: 152000,
    category: "Accommodation",
    date: "2026-08-11",
    description: "Three nights during the regional distributor roadshow.",
    receiptName: "hotel-folio.pdf",
    status: "Rejected",
    aiRecommendation: "Reject",
    aiSummary:
      "Nightly rate of ₦50,667 exceeds the ₦40,000 accommodation cap and a cheaper approved hotel was available.",
    categoryDetected: "Accommodation",
    policyFlag: "Nightly rate above accommodation cap",
    managerComment: "Rejected — please rebook within the approved hotel list.",
  },
  {
    id: "7",
    reference: "EXP-2026-100247",
    fullName: "Adaeze Nwosu",
    department: "Sales",
    title: "Printer toner cartridges",
    amount: 38500,
    category: "Office Supplies",
    date: "2026-08-05",
    description: "Replacement toner for the sales floor printer.",
    status: "Approved",
    aiRecommendation: "Approve",
    aiSummary: "Low-value consumable purchase within department supply budget.",
    categoryDetected: "Office Supplies",
    policyFlag: "No policy issues detected",
  },
  {
    id: "8",
    reference: "EXP-2026-100248",
    fullName: "Fatima Bello",
    department: "Finance",
    title: "Conference registration",
    amount: 95000,
    category: "Training",
    date: "2026-07-30",
    description: "West Africa Finance Leaders summit registration fee.",
    receiptName: "summit-receipt.pdf",
    status: "Rejected",
    aiRecommendation: "Review",
    aiSummary:
      "Registration is legitimate but falls outside the approved training calendar for the quarter.",
    categoryDetected: "Training",
    policyFlag: "Outside approved training calendar",
    managerComment: "Resubmit in Q4 when the training budget reopens.",
  },
];

// Simulates a read from YOUR_MAKE_READ_WEBHOOK. Swap the body for a fetch call
// once the webhook URL above is configured.
export async function fetchExpenses(): Promise<Expense[]> {
  return MOCK_EXPENSES;
}
