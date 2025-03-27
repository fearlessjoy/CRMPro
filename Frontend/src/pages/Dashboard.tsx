import { useState, useEffect } from "react";
import { BarChart3, CalendarDays, FileText, TrendingUp, Users } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { ProgressList } from "@/components/dashboard/ProgressList";
import { StatGroup } from "@/components/dashboard/StatGroup";
import { RemindersDashboard } from "@/components/dashboard/RemindersDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as leadService from "@/services/leadService";
import * as invoiceService from "@/services/invoiceService";
import { Lead } from "@/services/leadService";
import { Invoice } from "@/services/invoiceService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LeadTable from "@/components/leads/LeadTable";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadPortalStats } from "@/components/leads/LeadPortalStats";
import { RecentLeads } from "../components/dashboard/RecentLeads";
import { LeadsBySource } from "../components/dashboard/LeadsBySource";
import { LeadTimeline } from "../components/dashboard/LeadTimeline";
import { Overview } from "../components/dashboard/Overview";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { UnreadMessages } from "../components/dashboard/UnreadMessages";
import { getUserLeads, getDashboardStats } from "@/services/dashboardService";
import { DashboardLayoutProvider } from '@/contexts/DashboardLayoutContext';
import { DashboardRenderer } from '@/components/dashboard/DashboardRenderer';
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import * as processService from "@/services/processService";
import { Process } from "@/services/processService";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

interface LeadProgress {
  totalLeads: number;
  appliedCandidates: number;
  followUp: number;
  converted: number;
  serviceFeesPending: number;
  serviceFeesCollected: number;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

// Dashboard statistics
interface LeadStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  pendingTasks: number;
  processCounts: { name: string; count: number; }[];
  activeProcessCounts: { name: string; count: number; }[];
  previousPeriodStats?: {
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    pendingTasks: number;
  };
}

interface DashboardMetrics {
  totalLeadsInProcess: number;
  activeLeadsNotAssigned: number;
  activeLeads: {
    total: number;
    received: number;
    followUp: number;
    converted: number;
    dropped: number;
  };
  pendingTasks: number;
  processCounts: { name: string; count: number }[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<LeadStats>({
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    pendingTasks: 0,
    processCounts: [],
    activeProcessCounts: []
  });
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [leadProgress, setLeadProgress] = useState<LeadProgress>({
    totalLeads: 0,
    appliedCandidates: 0,
    followUp: 0,
    converted: 0,
    serviceFeesPending: 0,
    serviceFeesCollected: 0
  });
  const [isAddLeadSheetOpen, setIsAddLeadSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadPortalStats, setShowLeadPortalStats] = useState(false);
  const [useDragAndDrop, setUseDragAndDrop] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeadsInProcess: 0,
    activeLeadsNotAssigned: 0,
    activeLeads: {
      total: 0,
      received: 0,
      followUp: 0,
      converted: 0,
      dropped: 0
    },
    pendingTasks: 0,
    processCounts: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, allProcesses] = await Promise.all([
          getDashboardStats(),
          processService.getAllProcesses()
        ]);
        
        // Initialize process counts
        const processCounts = allProcesses.map(process => ({
          name: process.name,
          count: 0
        }));
        
        setStats({
          ...dashboardStats,
          processCounts,
          activeProcessCounts: processCounts,
          previousPeriodStats: dashboardStats.previousPeriodStats
        });
        setProcesses(allProcesses);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch leads and processes
        const [leadsData, allProcesses] = await Promise.all([
          leadService.getAllLeads(),
          processService.getAllProcesses()
        ]);
        
        setLeads(leadsData);
        setProcesses(allProcesses);
        
        // Calculate process counts for Total Leads in Process
        const processCountMap = new Map<string, number>();
        allProcesses.forEach(process => {
          const count = leadsData.filter(lead => 
            lead.currentProcessId === process.id && 
            lead.status !== 'dropped' && 
            lead.status !== 'converted'
          ).length;
          if (count > 0) {
            processCountMap.set(process.name, count);
          }
        });

        const processCounts = Array.from(processCountMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        
        // Calculate main metrics
        const totalLeadsInProcess = leadsData.filter(lead => 
          lead.currentProcessId && 
          lead.status !== 'dropped' && 
          lead.status !== 'converted'
        ).length;

        const activeLeadsNotAssigned = leadsData.filter(lead => 
          !lead.currentProcessId && 
          lead.status === 'active'
        ).length;

        // Calculate lead status counts for Active Leads card
        const receivedLeads = leadsData.filter(lead => lead.status === 'received').length;
        const followUpLeads = leadsData.filter(lead => lead.status === 'followup').length;
        const convertedLeads = leadsData.filter(lead => lead.status === 'converted').length;
        const droppedLeads = leadsData.filter(lead => lead.status === 'dropped').length;
        
        // Calculate pending tasks
        const pendingTaskCount = leadsData.reduce((count, lead) => {
          if (lead.assignedTo === currentUser?.uid && lead.tasks) {
            return count + lead.tasks.filter(task => !task.completed).length;
          }
          return count;
        }, 0);

        setStats({
          totalLeads: totalLeadsInProcess,
          activeLeads: activeLeadsNotAssigned,
          convertedLeads: receivedLeads + followUpLeads + convertedLeads + droppedLeads,
          pendingTasks: pendingTaskCount,
          processCounts: processCounts,
          activeProcessCounts: [
            { name: 'Lead Received', count: receivedLeads },
            { name: 'Lead Follow Up', count: followUpLeads },
            { name: 'Lead Converted', count: convertedLeads },
            { name: 'Lead Dropped', count: droppedLeads }
          ]
        });
        
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [currentUser]);

  useEffect(() => {
    const calculateMetrics = () => {
      // Calculate process counts for leads in process
      const processCountMap = new Map<string, number>();
      processes.forEach(process => {
        const count = leads.filter(lead => 
          lead.currentProcessId === process.id && 
          lead.status !== 'dropped' && 
          lead.status !== 'converted'
        ).length;
        if (count > 0) {
          processCountMap.set(process.name, count);
        }
      });

      const processCounts = Array.from(processCountMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate metrics based on the screenshot requirements
      const totalLeadsInProcess = leads.filter(lead => 
        lead.currentProcessId && 
        lead.status !== 'dropped' && 
        lead.status !== 'converted'
      ).length;

      const activeLeadsNotAssigned = leads.filter(lead => 
        !lead.currentProcessId && 
        lead.status === 'active'
      ).length;
      
      const activeLeadsMetrics = {
        total: leads.filter(lead => lead.status === 'active').length,
        received: leads.filter(lead => lead.status === 'received').length,
        followUp: leads.filter(lead => lead.status === 'followup').length,
        converted: leads.filter(lead => lead.status === 'converted').length,
        dropped: leads.filter(lead => lead.status === 'dropped').length
      };

      const pendingTasksCount = leads.reduce((count, lead) => {
        if (lead.assignedTo === currentUser?.uid && lead.tasks) {
          return count + lead.tasks.filter(task => !task.completed).length;
        }
        return count;
      }, 0);

      setMetrics({
        totalLeadsInProcess,
        activeLeadsNotAssigned,
        activeLeads: activeLeadsMetrics,
        pendingTasks: pendingTasksCount,
        processCounts
      });
    };

    if (leads.length > 0 && processes.length > 0) {
      calculateMetrics();
    }
  }, [leads, processes, currentUser]);

  // Generate progress items from the lead progress data
  const leadProgressItems = [
    { id: "1", label: "Total Leads", value: leadProgress.totalLeads, count: leadProgress.totalLeads, color: "blue" },
    { id: "2", label: "Applied Candidates", value: leadProgress.appliedCandidates, count: leadProgress.appliedCandidates, color: "green" },
    { id: "3", label: "Follow Up", value: leadProgress.followUp, count: leadProgress.followUp, color: "yellow" },
    { id: "4", label: "Lead Converted", value: leadProgress.converted, count: leadProgress.converted, color: "purple" },
    { id: "5", label: "Service Fees Pending", value: leadProgress.serviceFeesPending, count: leadProgress.serviceFeesPending, color: "indigo" },
    { id: "6", label: "Service Fees Collected", value: leadProgress.serviceFeesCollected, count: leadProgress.serviceFeesCollected, color: "pink" },
  ];

  // Calculate total for progress list
  const progressTotal = leadProgressItems.reduce((acc, item) => acc + item.value, 0);

  // Generate alert statistics for each category
  const pendingLeadsStats = [
    { label: "Total", value: leads.filter(lead => lead.status === 'active').length },
    { label: "7 Days", value: 3 }, // Example static value
    { label: "Tomorrow", value: 5 }, // Example static value
    { label: "> Month", value: 10 }, // Example static value
  ];

  const pendingTasksStats = [
    { label: "Total", value: pendingTasks.length },
    { label: "Today", value: Math.floor(pendingTasks.length * 0.3) }, // ~30% of tasks due today
    { label: "Tomorrow", value: Math.floor(pendingTasks.length * 0.3) }, // ~30% of tasks due tomorrow
    { label: "in 30 Days", value: pendingTasks.length }, // All tasks within 30 days
  ];

  const pendingInvoiceStats = [
    { label: "Total", value: invoices.filter(inv => inv.status === 'pending').length },
    { label: "Today", value: Math.floor(invoices.filter(inv => inv.status === 'pending').length * 0.2) }, // ~20% due today
    { label: "Tomorrow", value: Math.floor(invoices.filter(inv => inv.status === 'pending').length * 0.3) }, // ~30% due tomorrow
    { label: "in 30 Days", value: invoices.filter(inv => inv.status === 'pending').length }, // All pending invoices
  ];

  const untouchedFilesStats = [
    { label: "7 Days", value: 1 }, // Example static value
    { label: "15 Days", value: 1 }, // Example static value
    { label: "30 Days", value: 1 }, // Example static value
    { label: "60 Days", value: 1 }, // Example static value
  ];

  // Calculate performance percentage (% of converted leads from total)
  const performancePercentage = leads.length > 0 
    ? Math.round((leadProgress.converted / leadProgress.totalLeads) * 100) 
    : 0;

  const handleAddLead = async (lead: Omit<Lead, 'id'>) => {
    try {
      await leadService.createLead(lead);
      const updatedLeads = await leadService.getAllLeads();
      setLeads(updatedLeads);
      setIsAddLeadSheetOpen(false);
    } catch (error) {
      console.error("Error adding lead:", error);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadPortalStats(true);
  };

  // Calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 100; // If previous was 0, we consider it a 100% increase
    return ((current - previous) / previous) * 100;
  };

  // Stats cards with percentage change indicators
  const StatCard = ({ title, value, previousValue, loading, icon }: { 
    title: string; 
    value: number; 
    previousValue?: number;
    loading: boolean;
    icon?: React.ReactNode;
  }) => {
    const hasComparison = previousValue !== undefined;
    const percentChange = hasComparison ? calculateChange(value, previousValue) : 0;
    const isPositive = percentChange >= 0;

    return (
      <Card className="overflow-hidden border border-border/40 hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 bg-card">
          <div className="flex items-center space-x-2">
            {icon && <div className="text-primary/80">{icon}</div>}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {hasComparison && (
            <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              <span className="text-xs font-medium">{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="text-2xl font-bold">
            {loading ? <div className="h-5 w-10 bg-muted animate-pulse rounded" /> : value}
          </div>
          {hasComparison && (
            <p className="text-xs text-muted-foreground">
              {isPositive ? 'Increased' : 'Decreased'} from last period
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayoutProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseDragAndDrop(!useDragAndDrop)}
            >
              {useDragAndDrop ? "Disable" : "Enable"} Drag & Drop
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/leads" className="block hover:opacity-90 transition-opacity">
            <StatusCard
              title="Total Leads in Process"
              value={stats.totalLeads}
              status="neutral"
              icon={<Users className="h-4 w-4" />}
              description="Leads currently in various processes"
              processCounts={stats.processCounts}
            />
          </Link>
          <Link to="/leads?status=active" className="block hover:opacity-90 transition-opacity">
            <StatusCard
              title="Active Leads not assigned Process"
              value={stats.activeLeads}
              status="neutral"
              icon={<FileText className="h-4 w-4" />}
              description="Leads actively being processed"
            />
          </Link>
          <Link to="/leads?status=active" className="block hover:opacity-90 transition-opacity">
            <StatusCard
              title="Active Leads"
              value={stats.convertedLeads}
              status="neutral"
              icon={<TrendingUp className="h-4 w-4" />}
              description="Successfully converted leads"
              processCounts={stats.activeProcessCounts}
            />
          </Link>
          <Link to="/tasks" className="block hover:opacity-90 transition-opacity">
            <StatusCard
              title="My Pending Tasks"
              value={stats.pendingTasks}
              status="neutral"
              icon={<CalendarDays className="h-4 w-4" />}
              description="Tasks pending from your assigned leads"
            />
          </Link>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Recent Leads */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                Your most recent lead acquisitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentLeads />
            </CardContent>
          </Card>

          {/* Unread Messages */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Unread Messages</CardTitle>
              <CardDescription>
                Recent unread communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnreadMessages />
            </CardContent>
          </Card>

          {/* Lead Timeline */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Lead Timeline</CardTitle>
              <CardDescription>
                Recent lead activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadTimeline />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Charts Section */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Lead Sources Chart - spans 2 columns */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Leads by Source</CardTitle>
              <CardDescription>
                Distribution of leads across different sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsBySource />
            </CardContent>
          </Card>

          {/* Activity Overview */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Activity overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Overview />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Lead Sheet */}
      <Sheet open={isAddLeadSheetOpen} onOpenChange={setIsAddLeadSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add New Lead</SheetTitle>
            <SheetDescription>
              Fill in the details to create a new lead
            </SheetDescription>
          </SheetHeader>
          <LeadForm onSubmit={handleAddLead} onCancel={() => setIsAddLeadSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Lead Portal Stats Sheet */}
      <Sheet open={showLeadPortalStats} onOpenChange={setShowLeadPortalStats}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lead Portal Stats</SheetTitle>
            <SheetDescription>
              Detailed statistics for the selected lead
            </SheetDescription>
          </SheetHeader>
          {selectedLead && <LeadPortalStats leadId={selectedLead.id} />}
        </SheetContent>
      </Sheet>
    </DashboardLayoutProvider>
  );
};

export default Dashboard;
