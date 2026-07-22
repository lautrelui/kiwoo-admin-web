import { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, trend = "flat", icon, className }: Props) {
  const trendColor =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-ink-400";
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">{value}</div>
          {delta && (
            <div className={cn("mt-1 text-xs font-medium", trendColor)}>{delta}</div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</div>
        )}
      </div>
    </Card>
  );
}
