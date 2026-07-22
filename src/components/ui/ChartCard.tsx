import { ReactNode } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "./Card";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, children, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardBody>
        <div className="h-72 w-full">{children}</div>
      </CardBody>
    </Card>
  );
}
