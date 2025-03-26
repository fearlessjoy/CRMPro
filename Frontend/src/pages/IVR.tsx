
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Info, PhoneCall, Activity, Clock, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const IVR = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IVR System</h1>
        <p className="text-muted-foreground mt-1">Manage your interactive voice response system</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">Information</AlertTitle>
        <AlertDescription className="text-blue-600">
          Your IVR system is currently active and handling calls. View analytics and manage settings below.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:grid-cols-5 h-auto p-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calls" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Calls
          </TabsTrigger>
          <TabsTrigger value="flows" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Flows
          </TabsTrigger>
          <TabsTrigger value="recordings" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Recordings
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white py-2">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">320</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3m 42s</div>
                <p className="text-xs text-muted-foreground">
                  -0:15 from last month
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-card-hover transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">
                  +3% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div 
                    key={item} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">+1 (555) 123-456{item}</p>
                        <p className="text-xs text-muted-foreground">Today, 10:2{item} AM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">2:1{item} min</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">View All Calls</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4 min-h-[300px]">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Access your detailed call logs and history here.</p>
              <Separator className="my-4" />
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Call data is loading...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4 min-h-[300px]">
          <Card>
            <CardHeader>
              <CardTitle>IVR Flows</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Set up and manage your IVR call flows and menus.</p>
              <Separator className="my-4" />
              <div className="flex items-center justify-center h-40">
                <Button>Create New Flow</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4 min-h-[300px]">
          <Card>
            <CardHeader>
              <CardTitle>Call Recordings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Access and manage your saved call recordings.</p>
              <Separator className="my-4" />
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">No recordings available</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 min-h-[300px]">
          <Card>
            <CardHeader>
              <CardTitle>IVR Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configure your IVR system settings and preferences.</p>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Hours</label>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice Settings</label>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IVR;
