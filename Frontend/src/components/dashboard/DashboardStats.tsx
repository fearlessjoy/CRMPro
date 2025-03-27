import { Users, FileText, CheckCircle, Calendar } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface DashboardStatsProps {
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

export function DashboardStats({
  totalLeadsInProcess,
  activeLeadsNotAssigned,
  activeLeads,
  pendingTasks,
  processCounts
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Leads in Process */}
      <DashboardCard title="Total Leads in Process" icon={<Users className="h-5 w-5" />}>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">{totalLeadsInProcess}</div>
          <p className="text-sm text-muted-foreground">Leads currently in various processes</p>
          <div className="mt-2 space-y-1">
            {processCounts.map((process) => (
              <div key={process.name} className="flex justify-between text-sm">
                <span>{process.name}</span>
                <span>- {process.count}</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      {/* Active Leads not assigned Process */}
      <DashboardCard title="Active Leads not assigned Process" icon={<FileText className="h-5 w-5" />}>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">{activeLeadsNotAssigned}</div>
          <p className="text-sm text-muted-foreground">Leads actively being processed</p>
        </div>
      </DashboardCard>

      {/* Active Leads */}
      <DashboardCard title="Active Leads" icon={<CheckCircle className="h-5 w-5" />}>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">{activeLeads.total}</div>
          <p className="text-sm text-muted-foreground">Successfully converted leads</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Lead Received</span>
              <span>- {activeLeads.received}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lead Follow Up</span>
              <span>- {activeLeads.followUp}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lead Converted</span>
              <span>- {activeLeads.converted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lead Dropped</span>
              <span>- {activeLeads.dropped}</span>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* My Pending Tasks */}
      <DashboardCard title="My Pending Tasks" icon={<Calendar className="h-5 w-5" />}>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">{pendingTasks}</div>
          <p className="text-sm text-muted-foreground">Tasks pending from your assigned leads</p>
        </div>
      </DashboardCard>
    </div>
  );
} 