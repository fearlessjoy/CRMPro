import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CalendarIcon, ArrowRight, MessageSquare, LogOut, FileCheck, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as leadService from "@/services/leadService";
import { Lead } from "@/services/leadService";
import * as leadProcessService from "@/services/leadProcessService";
import { Process, Stage } from "@/services/leadProcessService";
import { format } from "date-fns";
import { LeadDocuments } from "@/components/leads/LeadDocuments";
import { Document, getRequiredDocuments, getLeadDocuments } from "@/services/leadDocumentService";
import { LeadMessages } from "@/components/leads/LeadMessages";

interface ProcessWithStages extends Process {
  stages: {
    [key: string]: Stage;
  };
}

const LeadPortal = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [processes, setProcesses] = useState<Record<string, ProcessWithStages>>({});
  const [loading, setLoading] = useState(true);
  const [documentStatus, setDocumentStatus] = useState<Document[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{title: string, date: string, type: 'deadline' | 'meeting'}>>([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [applicationSteps, setApplicationSteps] = useState<Array<{name: string, completed: boolean, percentage: number}>>([]);
  const [activeProcess, setActiveProcess] = useState<ProcessWithStages | null>(null);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);

  useEffect(() => {
    const loadLeadData = async () => {
      if (!leadId) return;
      
      try {
        setLoading(true);
        
        // Fetch lead data
        const leadData = await leadService.getLeadById(leadId);
        if (!leadData) {
          throw new Error("Lead not found");
        }
        
        setLead(leadData);

        // Check if user is authenticated in session storage
        const authenticatedLeadId = sessionStorage.getItem('leadPortalId');
        if (authenticatedLeadId !== leadId) {
          // Redirect to login if not authenticated
          navigate('/lead-login');
          return;
        }
        
        // Fetch all processes and their stages
        const allProcesses = await leadProcessService.getAllProcesses();
        const processMap: Record<string, ProcessWithStages> = {};
        
        // Load stages for each process
        const processesWithStages = await Promise.all(
          allProcesses.map(async (process) => {
            const stages = await leadProcessService.getStagesByProcess(process.id);
            return {
              ...process,
              stages: stages.reduce((acc, stage) => ({
                ...acc,
                [stage.id]: stage
              }), {})
            } as ProcessWithStages;
          })
        );

        // Convert to object format
        processesWithStages.forEach(process => {
          processMap[process.id] = process;
        });
        
        setProcesses(processMap);
        
        // Set active process and stage
        if (leadData.currentProcessId) {
          const currentProcess = processMap[leadData.currentProcessId];
          if (currentProcess) {
            setActiveProcess(currentProcess);
            
            // Calculate progress and set application steps
            if (leadData.currentStageId) {
              const currentStage = currentProcess.stages[leadData.currentStageId];
              if (currentStage) {
                setActiveStage(currentStage);
                calculateProgress(currentProcess, leadData.currentStageId);
              }
            }
          }
        }

        // Fetch document requirements and submitted documents
        const processId = leadData.currentProcessId || 'default';
        const stageId = leadData.currentStageId;
        
        // Fetch document requirements based on the lead's process/stage
        let requiredDocs: Document[] = [];
        if (processId) {
          requiredDocs = await getRequiredDocuments(processId, stageId || undefined);
        } else {
          // Default documents if no process is assigned
          requiredDocs = await getRequiredDocuments('default');
        }
        
        // Fetch already submitted documents for this lead
        const submittedDocs = await getLeadDocuments(leadId);
        
        // Create a map of document names to help with merging
        const submittedDocsMap = new Map();
        submittedDocs.forEach(doc => {
          submittedDocsMap.set(doc.name.toLowerCase(), doc);
        });
        
        // Merge required documents with submitted documents data
        const mergedDocuments = requiredDocs.map(reqDoc => {
          // Check if there's a submitted document matching this requirement
          const matchingSubmitted = submittedDocsMap.get(reqDoc.name.toLowerCase());
          
          // If found, use submitted document's status and data
          if (matchingSubmitted) {
            return {
              ...reqDoc,
              status: matchingSubmitted.status,
              uploadedAt: matchingSubmitted.uploadedAt,
              fileUrl: matchingSubmitted.fileUrl,
              fileType: matchingSubmitted.fileType,
              notes: matchingSubmitted.notes
            };
          }
          
          // Otherwise return the requirement with not_submitted status
          return reqDoc;
        });
        
        setDocumentStatus(mergedDocuments);

        // Generate real upcoming events based on lead status and process timeline
        const events = [];
        
        // 1. Document submission deadline (if documents are required and not all submitted)
        const pendingDocs = mergedDocuments.filter(doc => doc.status === 'not_submitted' || doc.status === 'rejected');
        if (pendingDocs.length > 0) {
          // Set deadline to 14 days from now or use actual deadline if available
          const deadlineDate = new Date();
          deadlineDate.setDate(deadlineDate.getDate() + 14);
          
          events.push({ 
            title: `${pendingDocs.length} Document${pendingDocs.length > 1 ? 's' : ''} Due`, 
            date: format(deadlineDate, 'MMMM d, yyyy'), 
            type: 'deadline' as const
          });
        }
        
        // 2. Next stage transition (if in active process)
        if (activeProcess && activeStage) {
          // Find the next stage in the process
          const stages = Object.values(activeProcess.stages).sort((a, b) => a.order - b.order);
          const currentStageIndex = stages.findIndex(stage => stage.id === activeStage.id);
          
          if (currentStageIndex < stages.length - 1) {
            const nextStage = stages[currentStageIndex + 1];
            
            // Expected date is typically 7-30 days after current stage, depending on the stage
            const nextStageDate = new Date();
            // For demo, use 14 days for first stages, 21 days for later stages
            const daysToAdd = currentStageIndex < 2 ? 14 : 21;
            nextStageDate.setDate(nextStageDate.getDate() + daysToAdd);
            
            events.push({ 
              title: `Next Stage: ${nextStage.name}`, 
              date: format(nextStageDate, 'MMMM d, yyyy'), 
              type: 'meeting' as const
            });
          }
        }
        
        // 3. Add scheduled meetings if assigned to someone
        if (leadData.assignedTo) {
          const meetingDate = new Date();
          meetingDate.setDate(meetingDate.getDate() + 7);
          
          // Get a user-friendly name instead of ID
          let assignedUserName = "Your Representative";
          
          // If the assignedTo value looks like a user ID (contains special chars or is very long)
          if (typeof leadData.assignedTo === 'string') {
            if (/^[a-zA-Z\s]+$/.test(leadData.assignedTo) && leadData.assignedTo.length < 20) {
              // If it's a simple name with no special characters, use it
              assignedUserName = leadData.assignedTo;
            } else {
              // It's probably a user ID, use the default friendly name
              assignedUserName = "Your Representative";
            }
          }
          
          events.push({ 
            title: `Meeting with ${assignedUserName}`, 
            date: format(meetingDate, 'MMMM d, yyyy'), 
            type: 'meeting' as const
          });
        }
        
        // Sort events by date
        events.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        setUpcomingEvents(events);
        
      } catch (error) {
        console.error("Error loading lead data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadLeadData();
  }, [leadId, navigate]);
  
  const calculateProgress = (process: ProcessWithStages, currentStageId: string) => {
    // Get all stages in order
    const stages = Object.values(process.stages).sort((a, b) => a.order - b.order);
    const currentStageIndex = stages.findIndex(stage => stage.id === currentStageId);
    
    if (currentStageIndex !== -1) {
      // Calculate overall progress percentage
      const progressPercent = Math.round(((currentStageIndex + 1) / stages.length) * 100);
      setProgressPercentage(progressPercent);
      
      // Generate application steps based on the process stages
      const steps = stages.map((stage, index) => ({
        name: stage.name,
        completed: index <= currentStageIndex,
        percentage: index < currentStageIndex ? 100 : (index === currentStageIndex ? progressPercent : 0)
      }));
      
      setApplicationSteps(steps);
    }
  };

  const handleLogout = () => {
    // Remove authentication from session storage
    sessionStorage.removeItem('leadPortalId');
    // Redirect to login
    navigate('/lead-login');
  };

  const formatDateFromTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return format(timestamp.toDate(), 'MMMM d, yyyy');
      }
      
      // Handle regular Date objects or ISO strings
      return format(new Date(timestamp), 'MMMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Helper function to get the status badge for document display
  const getDocumentStatusInfo = (status: Document["status"]) => {
    switch (status) {
      case "approved":
        return { color: "bg-green-500", label: "Verified", textColor: "bg-green-100 text-green-800" };
      case "pending":
        return { color: "bg-amber-500", label: "Pending", textColor: "bg-amber-100 text-amber-800" };
      case "rejected":
        return { color: "bg-red-500", label: "Rejected", textColor: "bg-red-100 text-red-800" };
      case "not_submitted":
      default:
        return { color: "bg-red-500", label: "Missing", textColor: "bg-red-100 text-red-800" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading your application data...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p>Lead not found or you don't have access to this portal.</p>
          <Button onClick={() => navigate('/lead-login')}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <h1 className="text-lg font-medium">Lead Portal</h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome, {lead.name}</h1>
          <p className="text-gray-500">Here's your application status</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-medium mb-4">Application Progress</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {activeProcess 
                      ? `Current Process: ${activeProcess.name}`
                      : "No active process"
                    }
                  </p>
                  
                  {applicationSteps.length > 0 ? (
                    <>
                      {applicationSteps.map((step, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{step.name}</span>
                            {step.completed ? (
                              <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                {step.percentage}%
                              </div>
                            ) : (
                              <div className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                {step.percentage}%
                              </div>
                            )}
                          </div>
                          <Progress value={step.percentage} className="h-2" />
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No process steps available</p>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-medium mb-2">Current Stage</h3>
                    {activeStage ? (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="font-medium text-blue-700">{activeStage.name}</div>
                        <p className="text-sm text-gray-600 mt-1">{activeStage.description || "No description available"}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No active stage</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-medium mb-4">Application Summary</h2>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-amber-500 font-medium">{lead.status || "In Progress"}</p>
                      <p className="text-xs text-gray-500">Status</p>
                    </div>
                    <div>
                      <p className="font-medium">{formatDateFromTimestamp(lead.createdAt)}</p>
                      <p className="text-xs text-gray-500">Submitted on</p>
                    </div>
                    <div>
                      <p className="font-medium">A-{lead.id.substring(0, 5)}</p>
                      <p className="text-xs text-gray-500">Reference ID</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Contact Information</h3>
                      <div className="text-sm">
                        <p><span className="text-gray-500">Email:</span> {lead.email}</p>
                        <p><span className="text-gray-500">Phone:</span> {lead.phone || "Not provided"}</p>
                        <p><span className="text-gray-500">Address:</span> {lead.address || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {lead.source && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-1">Source</h3>
                      <p className="text-sm">{lead.source}</p>
                    </div>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <Button 
                    className="w-full justify-center"
                    onClick={() => {
                      // Create a modal or sheet to display full application details
                      const leadDetails = {
                        ...lead,
                        process: activeProcess?.name || 'None',
                        stage: activeStage?.name || 'None',
                        progress: progressPercentage,
                        documentsCompleted: documentStatus.filter(d => d.status === 'approved').length,
                        totalDocuments: documentStatus.length
                      };
                      
                      // For now, just display in console and as alert
                      console.log('Full Application Details:', leadDetails);
                      alert(`Application ID: A-${lead.id.substring(0, 5)}\nStatus: ${lead.status || 'In Progress'}\nProcess: ${activeProcess?.name || 'None'}\nStage: ${activeStage?.name || 'None'}\nDocuments: ${documentStatus.filter(d => d.status === 'approved').length}/${documentStatus.length} completed`);
                    }}
                  >
                    <span className="mr-2">View Full Application</span>
                    <ExternalLink size={16} />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Document Status</h2>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="#documents" className="text-primary hover:bg-primary/10">
                        <span className="mr-2">View All</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {documentStatus.length > 0 ? (
                      documentStatus.slice(0, 5).map((doc, index) => {
                        const statusInfo = getDocumentStatusInfo(doc.status);
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color}`}></div>
                              <span>{doc.name}</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.textColor}`}>
                                    {statusInfo.label}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {doc.status === 'approved' 
                                    ? `Verified on ${doc.uploadedAt ? format(doc.uploadedAt, 'MMM d, yyyy') : 'N/A'}`
                                    : doc.status === 'pending' 
                                    ? `Uploaded on ${doc.uploadedAt ? format(doc.uploadedAt, 'MMM d, yyyy') : 'N/A'}, awaiting verification`
                                    : doc.status === 'rejected'
                                    ? `Rejected on ${doc.uploadedAt ? format(doc.uploadedAt, 'MMM d, yyyy') : 'N/A'}. Please resubmit.`
                                    : 'This document is missing and needs to be uploaded'
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No document requirements yet</p>
                    )}
                    {documentStatus.length > 5 && (
                      <p className="text-sm text-blue-500 font-medium">
                        +{documentStatus.length - 5} more documents
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Upcoming Events</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event, index) => (
                        <div key={index} className="flex items-start">
                          <div className={`p-2 rounded-full mr-3 ${
                            event.type === 'deadline' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {event.type === 'deadline' ? (
                              <AlertCircle className={`h-4 w-4 ${
                                event.type === 'deadline' ? 'text-red-500' : 'text-blue-500'
                              }`} />
                            ) : (
                              <CalendarIcon className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No upcoming events</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Document Requirements</CardTitle>
                  <Badge variant="outline">
                    {documentStatus.filter(d => d.status === 'approved').length}/{documentStatus.length} Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <LeadDocuments leadId={leadId || ""} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Messages</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {lead && (
                  <LeadMessages 
                    leadId={leadId || ""} 
                    lead={lead}
                    isLeadPortal={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LeadPortal; 