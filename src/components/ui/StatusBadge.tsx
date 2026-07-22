import { cn } from "@/lib/utils";

interface Props {
  status?: string;
  className?: string;
}

function styleFor(status?: string) {
  const s = (status || "").toUpperCase();
  if (["APPROVED", "COMPLETED", "ACTIVE", "SUCCESS", "VERIFIED"].includes(s))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["PENDING", "PROCESSING", "WAITING", "SUBMITTED"].includes(s))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (["REJECTED", "FAILED", "FROZEN", "BLOCKED", "CRITICAL"].includes(s))
    return "bg-red-50 text-red-700 border-red-200";
  if (["HIGH", "FLAGGED"].includes(s))
    return "bg-orange-50 text-orange-700 border-orange-200";
  if (["LOW", "INFO"].includes(s))
    return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-ink-100 text-ink-700 border-ink-200";
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styleFor(status),
        className
      )}
    >
      {status ?? "—"}
    </span>
  );
}
