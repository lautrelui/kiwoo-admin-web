import { cn } from "@/lib/utils";

/// Sprint 12.x — presence indicator for env vars, feature flags, WABA
/// content SIDs. Displays "Configured" / "Missing" only — never a
/// secret value.
interface Props {
  present: boolean;
  configuredLabel?: string;
  missingLabel?: string;
  className?: string;
}

export function PresenceBadge({
  present,
  configuredLabel = "Configured",
  missingLabel = "Missing",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        present
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-ink-100 text-ink-500 border-ink-200",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", present ? "bg-emerald-500" : "bg-ink-300")} />
      {present ? configuredLabel : missingLabel}
    </span>
  );
}
