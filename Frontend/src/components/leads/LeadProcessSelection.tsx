import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import * as leadProcessService from "@/services/leadProcessService";
import * as leadService from "@/services/leadService";
import { Process, Stage } from "@/services/leadProcessService";
import { Lead } from "@/services/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentRequirementsBadge } from "./DocumentRequirementsBadge";

interface LeadProcessSelectionProps {
  leadId: string;
  onProcessSelected?: (processId: string) => void;
  onStageChanged?: (stageId: string) => void;
}

export function LeadProcessSelection({ 
  leadId, 
  onProcessSelected, 
  onStageChanged 
}: LeadProcessSelectionProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [stages, setStages] = useState<Record<string, Stage[]>>({});
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [stageUpdateDialogOpen, setStageUpdateDialogOpen] = useState(false);
  const [stageNote, setStageNote] = useState("");
  const [stageToUpdateId, setStageToUpdateId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const auth = useAuth();

  // Load processes and stages
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load the lead data
        const leadData = await leadService.getLeadById(leadId);
        
        if (leadData) {
          // Set the selected process and stage from lead data
          if (leadData.currentProcessId) {
            setSelectedProcessId(leadData.currentProcessId);
          }
          if (leadData.currentStageId) {
            setCurrentStageId(leadData.currentStageId);
          }
        }
        
        // Load all processes
        const processesData = await leadProcessService.getAllProcesses();
        setProcesses(processesData.filter(p => p.isActive));
        
        // Load stages for each process
        const stagesMap: Record<string, Stage[]> = {};
        await Promise.all(
          processesData.map(async (process) => {
            const processStages = await leadProcessService.getStagesByProcess(process.id);
            stagesMap[process.id] = processStages.filter(s => s.isActive);
          })
        );
        
        setStages(stagesMap);
      } catch (error) {
        console.error("Error loading processes and stages:", error);
        toast({
          title: "Error",
          description: "Failed to load lead processes and stages",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, toast]);

  // Handle process selection
  const handleProcessSelect = async (processId: string) => {
    try {
      setUpdating(true);
      
      // Save the process selection to Firebase
      await leadService.assignProcessToLead(leadId, processId);
      
      // Update local state
      setSelectedProcessId(processId);
      
      // Reset current stage when process changes
      setCurrentStageId(null);
      
      // Notify parent component if callback provided
      if (onProcessSelected) {
        onProcessSelected(processId);
      }
      
      toast({
        title: "Process assigned",
        description: `Lead process has been updated to "${processes.find(p => p.id === processId)?.name}"`,
      });
    } catch (error) {
      console.error("Error selecting process:", error);
      toast({
        title: "Error",
        description: "Failed to update lead process",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle stage update
  const openStageUpdateDialog = (stageId: string) => {
    setStageToUpdateId(stageId);
    setStageNote("");
    setStageUpdateDialogOpen(true);
  };

  // Submit stage update
  const handleStageUpdate = async () => {
    if (!stageToUpdateId || !selectedProcessId) return;
    
    try {
      setUpdating(true);
      
      // Get current user for history tracking
      const currentUser = auth.currentUser;
      const updatedBy = currentUser ? currentUser.uid : undefined;
      
      // Update lead's current stage in Firebase
      await leadService.updateLeadStage(
        leadId,
        stageToUpdateId,
        selectedProcessId,
        stageNote,
        updatedBy
      );
      
      // Update local state
      setCurrentStageId(stageToUpdateId);
      
      // Notify parent component if callback provided
      if (onStageChanged) {
        onStageChanged(stageToUpdateId);
      }
      
      toast({
        title: "Stage updated",
        description: "The lead's stage has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating stage:", error);
      toast({
        title: "Error",
        description: "Failed to update lead stage",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setStageUpdateDialogOpen(false);
    }
  };

  // Calculate progress percentage based on current stage
  const calculateProgress = (): number => {
    if (!selectedProcessId || !currentStageId) return 0;
    
    const processStages = stages[selectedProcessId] || [];
    if (processStages.length === 0) return 0;
    
    const currentStageIndex = processStages.findIndex(stage => stage.id === currentStageId);
    if (currentStageIndex === -1) return 0;
    
    return Math.round(((currentStageIndex + 1) / processStages.length) * 100);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading processes and stages...</div>;
  }

  if (processes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No lead processes have been configured.</p>
            <p className="text-sm text-gray-400">
              Please set up processes and stages in the Lead Settings page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Process Selection */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Select Lead Process</h3>
          
          <RadioGroup 
            value={selectedProcessId || ""} 
            onValueChange={handleProcessSelect}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processes.map((process) => (
                <div key={process.id} className="flex items-start space-x-2">
                  <RadioGroupItem 
                    value={process.id} 
                    id={`process-${process.id}`} 
                    className="mt-1"
                  />
                  <div className="grid gap-1.5">
                    <Label 
                      htmlFor={`process-${process.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {process.name}
                    </Label>
                    <p className="text-sm text-gray-500">{process.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Stage Tracking (only shown when a process is selected) */}
      {selectedProcessId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <h3 className="text-lg font-medium">Lead Progress</h3>
              
              {currentStageId && (
                <div className="flex items-center mt-2 md:mt-0">
                  <span className="text-sm text-gray-500 mr-2">Current Stage:</span>
                  <Badge 
                    className={`bg-${stages[selectedProcessId]?.find(s => s.id === currentStageId)?.color || 'blue'}-500`}
                  >
                    {stages[selectedProcessId]?.find(s => s.id === currentStageId)?.name || 'Unknown Stage'}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <Progress value={calculateProgress()} className="h-2" />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">Start</span>
                <span className="text-xs text-gray-500">
                  {calculateProgress()}% Complete
                </span>
                <span className="text-xs text-gray-500">Complete</span>
              </div>
            </div>
            
            {/* Stage Selection */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <Label className="mb-2 md:mb-0">Update Lead Stage</Label>
                
                <div className="flex gap-2">
                  <Select 
                    value={stageToUpdateId || ""} 
                    onValueChange={setStageToUpdateId}
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages[selectedProcessId]?.sort((a, b) => a.order - b.order).map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-${stage.color}-500`}></div>
                            <span>{stage.name}</span>
                            <DocumentRequirementsBadge
                              leadId={leadId}
                              processId={selectedProcessId}
                              stageId={stage.id}
                              showTooltip={false}
                            />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => stageToUpdateId && openStageUpdateDialog(stageToUpdateId)}
                    disabled={!stageToUpdateId || updating}
                  >
                    Update
                  </Button>
                </div>
              </div>
              
              {/* Stage Timeline */}
              <div className="border rounded-md p-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Stage Timeline</h4>
                <div className="space-y-3">
                  {stages[selectedProcessId]?.sort((a, b) => a.order - b.order).map((stage) => {
                    const isCompleted = currentStageId ? 
                      stages[selectedProcessId]?.find(s => s.id === currentStageId)?.order as number > stage.order : 
                      false;
                    const isCurrent = stage.id === currentStageId;
                    
                    return (
                      <div 
                        key={stage.id} 
                        className={`flex items-start border-l-2 pl-4 py-2 ${
                          isCompleted ? 'border-green-500' : 
                          isCurrent ? `border-${stage.color}-500` : 
                          'border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              isCompleted ? 'bg-green-500' : 
                              isCurrent ? `bg-${stage.color}-500` : 
                              'bg-gray-200'
                            } mr-2`}>
                            </div>
                            <h5 className={`text-sm font-medium ${
                              isCompleted ? 'text-green-700' : 
                              isCurrent ? 'text-gray-900' : 
                              'text-gray-500'
                            }`}>
                              {stage.name}
                            </h5>
                            {isCompleted && (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="outline" className={`ml-2 bg-${stage.color}-50 text-${stage.color}-700 border-${stage.color}-200`}>
                                Current
                              </Badge>
                            )}
                            {/* Add document requirements badge */}
                            {!isCompleted && (
                              <DocumentRequirementsBadge
                                leadId={leadId}
                                processId={selectedProcessId}
                                stageId={stage.id}
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-5">{stage.description}</p>
                        </div>
                        <div>
                          {!isCompleted && !isCurrent && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openStageUpdateDialog(stage.id)}
                              disabled={updating}
                            >
                              Move to this stage
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Update Dialog */}
      <Dialog open={stageUpdateDialogOpen} onOpenChange={setStageUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Lead Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Moving to stage:</Label>
              <div className="flex items-center p-2 bg-gray-50 rounded">
                <div className={`w-3 h-3 rounded-full bg-${
                  stages[selectedProcessId || ""]?.find(s => s.id === stageToUpdateId)?.color || 'blue'
                }-500 mr-2`}></div>
                <span className="font-medium">
                  {stages[selectedProcessId || ""]?.find(s => s.id === stageToUpdateId)?.name || 'Unknown Stage'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageNote">Note (optional):</Label>
              <Textarea 
                id="stageNote" 
                value={stageNote} 
                onChange={(e) => setStageNote(e.target.value)}
                placeholder="Add any notes about this stage update"
                rows={3}
                disabled={updating}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={updating}>Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleStageUpdate}
              disabled={updating}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {updating ? "Updating..." : "Update Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 