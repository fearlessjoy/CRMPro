import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail } from "lucide-react";
import * as leadService from "@/services/leadService";
import * as leadProcessService from "@/services/leadProcessService";
import { Lead } from "@/services/leadService";
import { Process, Stage } from "@/services/leadProcessService";
import { EditLeadForm } from "@/components/leads/EditLeadForm";
import { SendPortalAccess } from "@/components/leads/SendPortalAccess";
import { LeadTimeline } from "@/components/leads/LeadTimeline";
import { LeadDocuments } from "@/components/leads/LeadDocuments";
import { LeadPortalStats } from "@/components/leads/LeadPortalStats";
import { LeadNotes } from "@/components/leads/LeadNotes";
import { format } from "date-fns";

const LeadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [process, setProcess] = useState<Process | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isPortalAccessDialogOpen, setIsPortalAccessDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const leadData = await leadService.getLeadById(id);
          const processData = await leadProcessService.getProcessById(leadData.processId);
          const stageData = await leadProcessService.getStageById(leadData.stageId);
          setLead(leadData);
          setProcess(processData);
          setStage(stageData);
        } catch (error) {
          console.error("Error fetching lead details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id]);

  // Format date for display
  const formatDate = (date: any): string => {
    if (!date) return "N/A";
    
    try {
      // Handle Firebase Timestamp
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      
      // Handle regular Date objects or ISO strings
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return "Invalid date";
    }
  };

  // Handle lead update
  const handleLeadUpdate = async (updatedLead: Omit<Lead, 'id'>) => {
    try {
      if (!id) return;
      await leadService.updateLead(id, updatedLead);
      
      // Refresh lead data
      const refreshedLead = await leadService.getLeadById(id);
      setLead(refreshedLead);
      
      // Exit edit mode
      setIsEditingLead(false);
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const handlePortalAccessSuccess = async () => {
    setIsPortalAccessDialogOpen(false);
    // Refresh lead data to get updated portal status
    if (id) {
      const refreshedLead = await leadService.getLeadById(id);
      setLead(refreshedLead);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p>Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p>Lead not found</p>
          <Button onClick={() => navigate('/leads')} className="mt-4">
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
          <p className="text-gray-500">{lead.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPortalAccessDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Portal Access
          </Button>
          <Button onClick={() => setIsEditingLead(true)}>
            Edit Lead
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full border-b mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {isEditingLead ? (
            <EditLeadForm 
              lead={lead} 
              onSave={handleLeadUpdate} 
              onCancel={() => setIsEditingLead(false)} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                      <p>{lead.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p>{lead.email}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                      <p>{lead.phone || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <Badge>{lead.status || "Active"}</Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Source</h3>
                      <p>{lead.source || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Created On</h3>
                      <p>{formatDate(lead.createdAt)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500">Address</h3>
                      <p>{lead.address || "N/A"}</p>
                    </div>
                    {lead.notes && (
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                        <p className="whitespace-pre-line">{lead.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Process Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Current Process</h3>
                    <p className="font-medium">{process?.name || "Not assigned"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Current Stage</h3>
                    <p className="font-medium">{stage?.name || "Not started"}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
                    <p>{lead.assignedTo || "Unassigned"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        <TabsContent value="notes">
          <LeadNotes leadId={id || ""} />
        </TabsContent>
        <TabsContent value="documents">
          <LeadDocuments leadId={id || ""} />
        </TabsContent>
        <TabsContent value="timeline">
          <LeadTimeline leadId={id || ""} />
        </TabsContent>
        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle>Lead Portal Stats</CardTitle>
              <CardDescription>View lead portal activity and status</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadPortalStats leadId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Portal Access Dialog */}
      <Dialog open={isPortalAccessDialogOpen} onOpenChange={setIsPortalAccessDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Send Portal Access</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <SendPortalAccess 
              lead={lead} 
              onSuccess={handlePortalAccessSuccess} 
              onCancel={() => setIsPortalAccessDialogOpen(false)} 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadDetails; 