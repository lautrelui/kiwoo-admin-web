import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "muted"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand"
  | "neutral";

interface Props {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const styles: Record<Tone, string> = {
  muted: "bg-ink-100 text-ink-600 border-ink-200",
  neutral: "bg-white text-ink-700 border-ink-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
};

/**
 * Small semantic chip for Operations Center pages.
 *
 * StatusBadge is tied to the domain vocabulary (APPROVED / PENDING /
 * FAILED / ...). Ops pages surface generic states like "healthy",
 * "wildcard", "0 err" — this Chip carries any label with a semantic
 * tone.
 */
export function Chip({ tone = "neutral", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
