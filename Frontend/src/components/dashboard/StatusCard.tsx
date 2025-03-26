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
      <div className="absolute top-0 right-0 w-1/2 h-1">
        <div className={cn(
          "h-full w-full bg-gradient-to-r",
          status === "positive" && "from-green-500/10 to-green-500/40",
          status === "negative" && "from-red-500/10 to-red-500/40",
          status === "neutral" && "from-blue-500/10 to-blue-500/40"
        )} />
      </div>
      <CardContent className="p-6 flex flex-col h-full min-h-[200px]">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-2xl font-semibold",
                status === "positive" && "text-green-600",
                status === "negative" && "text-red-600",
                status === "neutral" && "text-blue-600"
              )}>{value}</span>
              {period && <span className="text-xs text-muted-foreground pb-1">{period}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-full p-2.5",
              status === "positive" && "bg-green-100 text-green-600",
              status === "negative" && "bg-red-100 text-red-600",
              status === "neutral" && "bg-blue-100 text-blue-600"
            )}>
              {icon}
            </div>
          )}
        </div>
        
        {processCounts && processCounts.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex-1 space-y-3">
              {processCounts.map((process, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{process.name}</span>
                    <span className="text-sm font-semibold">{process.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        status === "positive" && "bg-green-500",
                        status === "negative" && "bg-red-500",
                        status === "neutral" && "bg-blue-500"
                      )}
                      style={{ 
                        width: `${(process.count / (value as number)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
