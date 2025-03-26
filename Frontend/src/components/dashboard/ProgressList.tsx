
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ProgressItem {
  id: string;
  label: string;
  value: number;
  count: number;
  color?: string;
}

interface ProgressListProps {
  items: ProgressItem[];
  total: number;
  className?: string;
}

export function ProgressList({ items, total, className }: ProgressListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item) => (
        <div key={item.id} className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{item.label}</span>
              <Badge variant="outline" className="text-xs ml-2">
                {item.count}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={(item.value / total) * 100}
            className={cn(
              "h-2",
              item.color ? `bg-${item.color}-100` : "bg-blue-100"
            )}
            indicatorClassName={cn(
              item.color ? `bg-${item.color}-500` : "bg-blue-500"
            )}
          />
        </div>
      ))}
    </div>
  );
}
