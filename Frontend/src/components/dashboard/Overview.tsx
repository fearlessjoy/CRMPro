import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/services/dashboardService";

export function Overview() {
  const [totalLeads, setTotalLeads] = useState(0);
  const [activeLeads, setActiveLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const stats = await getDashboardStats();
        setTotalLeads(stats.totalLeads);
        setActiveLeads(stats.activeLeads);
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Calculate active leads percentage
  const activePercentage = totalLeads > 0 ? Math.round((activeLeads / totalLeads) * 100) : 0;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Quick overview of your leads and conversion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-6 w-full bg-muted rounded animate-pulse mt-4" />
            <div className="h-16 w-full bg-muted rounded animate-pulse mt-4" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Active Leads</p>
                <p className="text-2xl font-bold">{activeLeads}</p>
              </div>
              <div>
                <Badge variant={activePercentage > 50 ? "default" : "destructive"}>
                  {activePercentage}% of total
                </Badge>
              </div>
            </div>
            
            <Progress value={activePercentage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-xl font-bold">{totalLeads}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold">{activePercentage}%</p>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-sm font-medium mb-2">Lead Status</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <p className="text-sm">Active</p>
                  <p className="text-sm font-medium">{activeLeads}</p>
                </div>
                <Progress value={activePercentage} className="h-1" />
                
                <div className="flex justify-between mt-2">
                  <p className="text-sm">Inactive</p>
                  <p className="text-sm font-medium">{totalLeads - activeLeads}</p>
                </div>
                <Progress value={100 - activePercentage} className="h-1" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 