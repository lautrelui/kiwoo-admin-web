import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Standard filter row wrapper — a single horizontal strip that wraps
 * on mobile. Individual filters are just labelled `<input>`s /
 * `<select>`s; keeping them un-abstracted means adding a filter is
 * one line of JSX per page instead of a schema.
 */
export function FilterBar({ children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs", className)}>
      <span className="font-medium uppercase tracking-wide text-ink-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FilterInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={cn(
        "rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-sm shadow-sm",
        "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        props.className,
      )}
    />
  );
}

export function FilterSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(
        "rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-sm shadow-sm",
        "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        props.className,
      )}
    />
  );
}
