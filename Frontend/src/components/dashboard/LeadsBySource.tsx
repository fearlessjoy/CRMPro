import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadsBySource } from "@/services/dashboardService";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart } from "lucide-react";

interface SourceData {
  name: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
}

// Colors for different sources
const sourceColors: Record<string, { bg: string, hover: string, text: string }> = {
  "CSV Import": { bg: "bg-blue-500", hover: "bg-blue-600", text: "text-blue-500" },
  "Socialmedia": { bg: "bg-emerald-500", hover: "bg-emerald-600", text: "text-emerald-500" },
  "Unknown": { bg: "bg-violet-500", hover: "bg-violet-600", text: "text-violet-500" },
  "Website": { bg: "bg-amber-500", hover: "bg-amber-600", text: "text-amber-500" },
  "Referral": { bg: "bg-rose-500", hover: "bg-rose-600", text: "text-rose-500" },
  "Email Campaign": { bg: "bg-indigo-500", hover: "bg-indigo-600", text: "text-indigo-500" },
  "Cold Call": { bg: "bg-fuchsia-500", hover: "bg-fuchsia-600", text: "text-fuchsia-500" },
  "Event": { bg: "bg-cyan-500", hover: "bg-cyan-600", text: "text-cyan-500" },
  "Partner": { bg: "bg-teal-500", hover: "bg-teal-600", text: "text-teal-500" }
};

// Default color if not in the mapping
const defaultColor = { bg: "bg-slate-500", hover: "bg-slate-600", text: "text-slate-500" };

export function LeadsBySource() {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  
  useEffect(() => {
    const fetchLeadsBySource = async () => {
      try {
        setLoading(true);
        const sourceData = await getLeadsBySource();
        
        // Calculate total leads
        const total = Object.values(sourceData).reduce((sum, count) => sum + count, 0);
        setTotalLeads(total);
        
        // Transform data for display
        const formattedSources = Object.entries(sourceData)
          .map(([name, count]) => {
            const colorData = sourceColors[name] || defaultColor;
            return {
              name,
              count,
              percentage: total > 0 ? Math.round((count / total) * 100) : 0,
              color: colorData.bg,
              hoverColor: colorData.hover
            };
          })
          .sort((a, b) => b.count - a.count); // Sort by count descending
        
        setSources(formattedSources);
      } catch (error) {
        console.error("Error fetching leads by source:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadsBySource();
  }, []);
  
  return (
    <Card className="h-full overflow-hidden border border-border/40 hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-card">
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Leads by Source
        </CardTitle>
        <CardDescription>Distribution of leads by their source</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : sources.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <p className="text-muted-foreground">No source data available</p>
          </div>
        ) : (
          // Source data
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-card shadow-sm border border-border/60 p-3 rounded-lg transition-all hover:border-primary/20">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <div className="bg-card shadow-sm border border-border/60 p-3 rounded-lg transition-all hover:border-primary/20">
                <p className="text-sm text-muted-foreground">Sources</p>
                <p className="text-2xl font-bold">{sources.length}</p>
              </div>
            </div>
            
            {/* Source list */}
            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.name} className="space-y-1 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${source.color} rounded-full mr-2`} />
                      <span className={`text-sm font-medium ${sourceColors[source.name]?.text || defaultColor.text}`}>
                        {source.name}
                      </span>
                    </div>
                    <div className={`text-sm font-medium ${sourceColors[source.name]?.text || defaultColor.text}`}>
                      {source.count} ({source.percentage}%)
                    </div>
                  </div>
                  <Progress 
                    value={source.percentage} 
                    className="h-2.5 bg-secondary/20"
                    indicatorClassName={`${source.color} transition-all duration-300`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 