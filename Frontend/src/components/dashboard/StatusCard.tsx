import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ProcessCount {
  name: string;
  count: number;
}

interface StatusCardProps {
  title: string;
  value: string | number;
  period?: string;
  status?: "neutral" | "positive" | "negative";
  icon?: React.ReactNode;
  className?: string;
  description?: string;
  processCounts?: ProcessCount[];
}

export function StatusCard({ 
  title, 
  value, 
  period, 
  status = "neutral", 
  icon, 
  className, 
  description,
  processCounts 
}: StatusCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden hover:shadow-md transition-all duration-200 border-l-4",
      status === "positive" && "border-l-green-500",
      status === "negative" && "border-l-red-500", 
      status === "neutral" && "border-l-blue-500",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <p className="text-base font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold",
                status === "positive" && "text-green-600",
                status === "negative" && "text-red-600",
                status === "neutral" && "text-primary"
              )}>{value}</span>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-full p-2.5",
              status === "positive" && "bg-green-100 text-green-600",
              status === "negative" && "bg-red-100 text-red-600",
              status === "neutral" && "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
          )}
        </div>
        
        {processCounts && processCounts.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              {processCounts.map((process, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">{process.name}</span>
                  <span className="font-semibold">- {process.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
