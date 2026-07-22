import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onRefresh: () => void;
  loading?: boolean;
  right?: ReactNode;
  lastRefreshedAt?: Date | null;
  className?: string;
}

/**
 * Standard header for every Operations Center page.
 *
 * Provides the "title + subtitle + refresh + last-refreshed" strip so
 * operators can always tell how stale the view is and re-fetch on
 * demand. `right` is a slot for page-specific actions (Replay, Export,
 * pagination).
 */
export function RefreshBar({
  title,
  subtitle,
  onRefresh,
  loading,
  right,
  lastRefreshedAt,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {lastRefreshedAt && (
          <span className="hidden text-xs text-ink-400 sm:inline">
            Updated {formatRelative(lastRefreshedAt)}
          </span>
        )}
        {right}
        <Button variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "↺ Refresh"}
        </Button>
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleTimeString();
}
