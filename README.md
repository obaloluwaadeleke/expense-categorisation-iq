# Expense IQ

Build a web app called ExpenseIQ — an AI-powered business expense management system. No authentication. Home screen has Employee, Manager, Admin role selector buttons that navigate to those sections. Use a clean professional corporate UI: Inter, deep navy #1B2A4A, emerald #10B981, off-white #F8FAFC, subtle card shadows, status badges pending amber/approved green/rejected red, Nigerian Naira ₦ values.

Employee: submission form with Full Name, Department, Expense Title, Amount ₦, category dropdown (Travel & Transport, Office Supplies, Meals & Entertainment, Accommodation, Training, Other), Date, Description, optional image/PDF receipt upload. When amount >=100000 show exact warning: “⚠ This amount requires manager approval.” On submit POST fields as JSON to a configurable constant placeholder YOUR_MAKE_WEBHOOK_URL and show success screen with generated reference number. Also My Submissions table: title, amount, category, date, status, populated from mock data with a configurable YOUR_MAKE_READ_WEBHOOK constant.

Manager: Approval Queue cards for pending expenses, with submitter, title, amount, date, category, AI recommendation badge, AI summary, Approve, Reject, View Full. Expenses >= ₦100,000 get a red HIGH badge. Mock data and configurable read webhook, conceptually filtered Pending. Full Expense Detail: all fields, AI analysis (Category Detected, Policy Flag, Recommendation, AI Summary), manager comment, Approve/Reject that PATCH to configurable YOUR_MAKE_UPDATE_WEBHOOK with decision and comment.

Admin dashboard: Total Spend, Total Approved, Total Rejected, Total Pending stat cards; simple category breakdown chart; approval-rate percentage; complete searchable records table with all statuses; export button placeholder. Keep all webhook URLs easily configurable as constants at top of relevant files. UI must be functional entirely on mock JSON prior to connecting webhooks.


**Live app**: https://expense-categorisation-iq.lovable.app

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
