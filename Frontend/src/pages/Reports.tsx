
import { useState } from "react";
import { BarChart, LineChart, PieChart, BarChart3, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Reports = () => {
  const [timeRange, setTimeRange] = useState("month");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">View and analyze your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px] border-0 p-0 h-auto font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Leads
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Sales
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,091</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <span className="text-xs mr-1">↑</span> 12% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.4%</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <span className="text-xs mr-1">↑</span> 2.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2h</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <span className="text-xs mr-1">↑</span> 15% faster than last month
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$24,500</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <span className="text-xs mr-1">↑</span> 18% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Lead Acquisition</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>New leads over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chart Visualization</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Lead acquisition trend showing growth patterns over the selected time period
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Conversion Funnel</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>Lead journey stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chart Visualization</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Conversion funnel showing progress from lead generation to closing
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Lead Sources</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>Where your leads come from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chart Visualization</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Pie chart showing distribution of lead sources
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Response Times</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>Lead response time analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chart Visualization</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Line chart showing response time performance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Revenue by Service</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>Revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chart Visualization</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Bar chart showing revenue distribution by service type
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4 min-h-[500px]">
          <Card>
            <CardHeader>
              <CardTitle>Lead Analytics</CardTitle>
              <CardDescription>Detailed lead performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center p-6">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-medium">Lead Performance Dashboard</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Detailed lead analytics would be displayed here, including conversion rates, 
                    source effectiveness, and lead quality metrics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 min-h-[500px]">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>Revenue and sales metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center p-6">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-medium">Sales Analytics Dashboard</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Comprehensive sales data would be displayed here, including revenue trends, 
                    sales by product/service, and forecasting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 min-h-[500px]">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Agent and team productivity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center p-6">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-medium">Performance Analytics</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Team and individual performance metrics would be displayed here, including 
                    conversion rates, response times, and customer satisfaction scores.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
