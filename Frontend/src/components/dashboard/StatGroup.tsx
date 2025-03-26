
import { cn } from "@/lib/utils";

interface StatItemProps {
  label: string;
  value: string | number;
  valueClassName?: string;
  labelClassName?: string;
}

function StatItem({ label, value, valueClassName, labelClassName }: StatItemProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn("text-xl font-semibold", valueClassName)}>
        {value}
      </div>
      <div className={cn("text-xs text-muted-foreground mt-1", labelClassName)}>
        {label}
      </div>
    </div>
  );
}

interface StatGroupProps {
  items: StatItemProps[];
  className?: string;
}

export function StatGroup({ items, className }: StatGroupProps) {
  return (
    <div className={cn("flex justify-between", className)}>
      {items.map((item, index) => (
        <StatItem key={index} {...item} />
      ))}
    </div>
  );
}
