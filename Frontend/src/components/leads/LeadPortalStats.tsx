import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  Clock, 
  FileCheck, 
  Users, 
  AlertTriangle,
  ExternalLink,
  Calendar
} from "lucide-react";
import * as leadService from "@/services/leadService";
import * as leadProcessService from "@/services/leadProcessService";
import { Lead } from "@/services/leadService";
import { Process, Stage } from "@/services/leadProcessService";

interface LeadPortalStatsProps {
  leadId?: string;
}

interface LeadWithProcess extends Lead {
  process?: {
    name: string;
    id: string;
  };
  stage?: {
    name: string;
    id: string;
  };
  lastLogin?: Date | null;
  documentCount?: {
    total: number;
    verified: number;
    pending: number;
    missing: number;
  };
}

export function LeadPortalStats({ leadId }: LeadPortalStatsProps) {
  const [lead, setLead] = useState<LeadWithProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ 
    action: string;
    date: Date;
    type: 'login' | 'document' | 'message' | 'status';
  }>>([]);

  useEffect(() => {
    async function loadData() {
      if (!leadId) return;
      
      try {
        setLoading(true);
        
        // Fetch lead data
        const leadData = await leadService.getLeadById(leadId);
        
        // Fetch processes and stages
        const allProcesses = await leadProcessService.getAllProcesses();
        setProcesses(allProcesses);
        
        if (leadData?.currentProcessId) {
          const processStages = await leadProcessService.getStagesByProcess(leadData.currentProcessId);
          setStages(processStages);
        }
        
        // In a real app, fetch portal activity, document stats, etc.
        const enhancedLead: LeadWithProcess = {
          ...leadData,
          process: allProcesses.find(p => p.id === leadData?.currentProcessId),
          stage: leadData?.currentStageId ? 
            (await leadProcessService.getStagesByProcess(leadData.currentProcessId))
              .find(s => s.id === leadData.currentStageId) : 
            undefined,
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Mock data: 2 days ago
          documentCount: {
            total: 5,
            verified: 2,
            pending: 1,
            missing: 2
          }
        };
        
        setLead(enhancedLead);
        
        // Mock recent activity data
        const mockActivity = [
          {
            action: 'Logged into portal',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            type: 'login' as const
          },
          {
            action: 'Uploaded ID document',
            date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            type: 'document' as const
          },
          {
            action: 'Stage updated to Document Verification',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            type: 'status' as const
          }
        ];
        
        setRecentActivity(mockActivity);
        
      } catch (error) {
        console.error("Error loading lead portal data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [leadId]);
  
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Never';
    return format(date, 'MMM d, yyyy');
  };

  const getPortalUrl = (id: string) => {
    // In production this should use the actual domain
    return `/lead-portal/${id}`;
  };
  
  const sendPortalReminder = async () => {
    if (!lead?.id) return;
    
    try {
      // Call your service to send a reminder email
      // await leadService.sendPortalReminder(lead.id);
      alert('Portal reminder sent to lead');
    } catch (error) {
      console.error('Error sending portal reminder:', error);
    }
  };

  if (loading) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500">Loading portal data...</p>
        </div>
      </Card>
    );
  }
  
  if (!lead) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500">No lead data found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Lead Portal Status</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <a href={getPortalUrl(lead.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Portal
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Portal Access</div>
              <div className="flex items-center gap-2">
                <Badge variant={lead.lastLogin ? "default" : "destructive"}>
                  {lead.lastLogin ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm font-medium">{lead.lastLogin ? "Account active" : "Never logged in"}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Last Login</div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{formatDate(lead.lastLogin)}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Documents</div>
              <div className="flex items-center gap-1">
                <FileCheck className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {lead.documentCount?.verified || 0} verified / {lead.documentCount?.total || 0} total
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Current Process</h3>
              <Badge variant="outline" className="font-normal">
                {lead.process?.name || "No process assigned"}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Current Stage</h3>
              <Badge variant="outline" className="font-normal">
                {lead.stage?.name || "No stage assigned"}
              </Badge>
            </div>
            
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={sendPortalReminder}>
                Send Reminder
              </Button>
              
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Recent Portal Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start">
                  <div className={`p-2 rounded-full mr-3 ${
                    activity.type === 'login' ? 'bg-blue-100' : 
                    activity.type === 'document' ? 'bg-green-100' : 
                    activity.type === 'message' ? 'bg-purple-100' : 
                    'bg-amber-100'
                  }`}>
                    {activity.type === 'login' && <Users className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'document' && <FileCheck className="h-4 w-4 text-green-600" />}
                    {activity.type === 'message' && <Users className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'status' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">{format(activity.date, 'MMM d, yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 