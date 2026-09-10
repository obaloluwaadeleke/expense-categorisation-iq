import type { Status } from "@/lib/expense-data";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  Pending: "bg-pending text-pending-foreground",
  Approved: "bg-approved text-approved-foreground",
  Rejected: "bg-rejected text-rejected-foreground",
  "Needs Clarification": "bg-pending text-pending-foreground",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

export function AiBadge({ recommendation }: { recommendation: string }) {
  const tone =
    recommendation === "Approve"
      ? "bg-approved text-approved-foreground"
      : recommendation === "Reject"
        ? "bg-rejected text-rejected-foreground"
        : "bg-pending text-pending-foreground";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        tone,
      )}
    >
      AI: {recommendation}
    </span>
  );
}

export function HighBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-destructive px-3 py-1 text-xs font-bold tracking-wide text-destructive-foreground">
      HIGH
    </span>
  );
}
