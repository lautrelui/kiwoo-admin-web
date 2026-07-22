import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  detail?: ReactNode;
  tone?: "error" | "warning" | "info";
  className?: string;
}

/// Sprint 12.x — page-level error/info banner, matches admin console
/// visual language. Used for load failures, 63016 highlight, etc.
export function ErrorBanner({ title, detail, tone = "error", className }: Props) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-soft",
        styles,
        className,
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      {detail && <div className="mt-1 text-sm">{detail}</div>}
    </div>
  );
}
