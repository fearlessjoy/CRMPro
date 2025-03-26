import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function DashboardCard({ title, children, className, icon }: DashboardCardProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-border/40", className)}>
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 bg-card">
        <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        {icon && <div className="text-primary/80">{icon}</div>}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
