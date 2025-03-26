import { useState, useEffect } from "react";
import { SettingsPageTemplate } from "@/components/settings/SettingsPageTemplate";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import * as leadProcessService from "@/services/leadProcessService";
import { Process, Stage } from "@/services/leadProcessService";

const colorOptions = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
  { value: "yellow", label: "Yellow" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "indigo", label: "Indigo" },
];

const LeadsSettings = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [stages, setStages] = useState<Record<string, Stage[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"process" | "stage">("process");
  const [deleteItemId, setDeleteItemId] = useState<string>("");
  const [stagesOrderChanged, setStagesOrderChanged] = useState<Record<string, boolean>>({});

  const { toast } = useToast();

  // New process form state
  const [newProcess, setNewProcess] = useState<Omit<Process, "id" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    isActive: true,
    order: 0
  });

  // New stage form state
  const [newStage, setNewStage] = useState<Omit<Stage, "id" | "processId" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    color: "blue",
    isActive: true,
    order: 0
  });

  // Load processes and stages from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load processes
        const processesData = await leadProcessService.getAllProcesses();
        setProcesses(processesData);
        
        // Load stages for each process
        const stagesMap: Record<string, Stage[]> = {};
        await Promise.all(
          processesData.map(async (process) => {
            const processStages = await leadProcessService.getStagesByProcess(process.id);
            stagesMap[process.id] = processStages;
          })
        );
        
        setStages(stagesMap);
        
        // Expand first process by default if there are processes
        if (processesData.length > 0) {
          setExpandedProcesses([processesData[0].id]);
        }
      } catch (error) {
        console.error("Error loading lead processes and stages:", error);
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
  }, [toast]);

  // Toggle process expansion
  const toggleProcessExpansion = (processId: string) => {
    setExpandedProcesses((prev) => 
      prev.includes(processId) 
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  // Handle process status toggle
  const toggleProcessStatus = async (processId: string) => {
    try {
      const process = processes.find(p => p.id === processId);
      if (!process) return;
      
      // Update in Firestore
      await leadProcessService.updateProcess(processId, { 
        isActive: !process.isActive 
      });
      
      // Update local state
      setProcesses(processes.map(p => 
        p.id === processId 
          ? { ...p, isActive: !p.isActive }
          : p
      ));
      
      toast({
        title: "Status updated",
        description: `Process "${process.name}" is now ${!process.isActive ? 'active' : 'inactive'}`,
      });
    } catch (error) {
      console.error("Error toggling process status:", error);
      toast({
        title: "Error",
        description: "Failed to update process status",
        variant: "destructive",
      });
    }
  };

  // Handle stage status toggle
  const toggleStageStatus = async (processId: string, stageId: string) => {
    try {
      const stage = stages[processId]?.find(s => s.id === stageId);
      if (!stage) return;
      
      // Update in Firestore
      await leadProcessService.updateStage(stageId, { 
        isActive: !stage.isActive 
      });
      
      // Update local state
      setStages({
        ...stages,
        [processId]: stages[processId].map(s => 
          s.id === stageId 
            ? { ...s, isActive: !s.isActive }
            : s
        )
      });
      
      toast({
        title: "Status updated",
        description: `Stage "${stage.name}" is now ${!stage.isActive ? 'active' : 'inactive'}`,
      });
    } catch (error) {
      console.error("Error toggling stage status:", error);
      toast({
        title: "Error",
        description: "Failed to update stage status",
        variant: "destructive",
      });
    }
  };

  // Open add/edit process dialog
  const openProcessDialog = (process?: Process) => {
    if (process) {
      setSelectedProcess(process);
      setNewProcess({
        name: process.name,
        description: process.description,
        isActive: process.isActive,
        order: process.order
      });
    } else {
      setSelectedProcess(null);
      setNewProcess({
        name: "",
        description: "",
        isActive: true,
        order: processes.length + 1
      });
    }
    setIsProcessDialogOpen(true);
  };

  // Open add/edit stage dialog
  const openStageDialog = (processId: string, stage?: Stage) => {
    setCurrentProcessId(processId);
    if (stage) {
      setSelectedStage(stage);
      setNewStage({
        name: stage.name,
        description: stage.description,
        color: stage.color,
        isActive: stage.isActive,
        order: stage.order
      });
    } else {
      setSelectedStage(null);
      setNewStage({
        name: "",
        description: "",
        color: "blue",
        isActive: true,
        order: (stages[processId]?.length || 0) + 1
      });
    }
    setIsStageDialogOpen(true);
  };

  // Confirm delete dialog open
  const openDeleteDialog = (type: "process" | "stage", id: string) => {
    setDeleteType(type);
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  // Delete process or stage
  const handleDelete = async () => {
    try {
      if (deleteType === "process") {
        // Delete process and its stages in Firestore
        await leadProcessService.deleteProcess(deleteItemId);
        
        // Update local state
        setProcesses(processes.filter(process => process.id !== deleteItemId));
        
        // Remove from expanded processes
        setExpandedProcesses(expandedProcesses.filter(id => id !== deleteItemId));
        
        // Remove stages for this process
        const newStages = { ...stages };
        delete newStages[deleteItemId];
        setStages(newStages);
        
        toast({
          title: "Process deleted",
          description: "The process and its stages have been deleted",
        });
      } else {
        // Find which process this stage belongs to
        let processId = "";
        Object.entries(stages).forEach(([pId, stageList]) => {
          if (stageList.some(s => s.id === deleteItemId)) {
            processId = pId;
          }
        });
        
        if (processId) {
          // Delete stage in Firestore
          await leadProcessService.deleteStage(deleteItemId);
          
          // Update local state
          setStages({
            ...stages,
            [processId]: stages[processId].filter(stage => stage.id !== deleteItemId)
          });
          
          toast({
            title: "Stage deleted",
            description: "The stage has been deleted",
          });
        }
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Save process
  const saveProcess = async () => {
    try {
      setSaving(true);
      
      if (selectedProcess) {
        // Edit existing process
        await leadProcessService.updateProcess(selectedProcess.id, {
          name: newProcess.name,
          description: newProcess.description,
          isActive: newProcess.isActive,
          order: newProcess.order
        });
        
        // Update local state
        setProcesses(processes.map(process => 
          process.id === selectedProcess.id 
            ? { 
                ...process, 
                name: newProcess.name,
                description: newProcess.description,
                isActive: newProcess.isActive,
                order: newProcess.order
              }
            : process
        ));
        
        toast({
          title: "Process updated",
          description: `Process "${newProcess.name}" has been updated`,
        });
      } else {
        // Add new process
        const createdProcess = await leadProcessService.createProcess({
          name: newProcess.name,
          description: newProcess.description,
          isActive: newProcess.isActive,
          order: processes.length + 1
        });
        
        // Update local state
        setProcesses([...processes, createdProcess]);
        
        // Initialize empty stages array for this process
        setStages({
          ...stages,
          [createdProcess.id]: []
        });
        
        // Auto-expand the new process
        setExpandedProcesses([...expandedProcesses, createdProcess.id]);
        
        toast({
          title: "Process created",
          description: `Process "${newProcess.name}" has been created`,
        });
      }
    } catch (error) {
      console.error("Error saving process:", error);
      toast({
        title: "Error",
        description: "Failed to save process",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsProcessDialogOpen(false);
    }
  };

  // Save stage
  const saveStage = async () => {
    if (!currentProcessId) return;
    
    try {
      setSaving(true);
      
      if (selectedStage) {
        // Edit existing stage
        await leadProcessService.updateStage(selectedStage.id, {
          name: newStage.name,
          description: newStage.description,
          color: newStage.color,
          isActive: newStage.isActive,
          order: newStage.order
        });
        
        // Update local state
        setStages({
          ...stages,
          [currentProcessId]: stages[currentProcessId].map(stage => 
            stage.id === selectedStage.id 
              ? { 
                  ...stage, 
                  name: newStage.name,
                  description: newStage.description,
                  color: newStage.color,
                  isActive: newStage.isActive,
                  order: newStage.order
                }
              : stage
          )
        });
        
        toast({
          title: "Stage updated",
          description: `Stage "${newStage.name}" has been updated`,
        });
      } else {
        // Add new stage
        const createdStage = await leadProcessService.createStage(currentProcessId, {
          name: newStage.name,
          description: newStage.description,
          color: newStage.color,
          isActive: newStage.isActive,
          order: (stages[currentProcessId]?.length || 0) + 1
        });
        
        // Update local state
        setStages({
          ...stages,
          [currentProcessId]: [...(stages[currentProcessId] || []), createdStage]
        });
        
        toast({
          title: "Stage created",
          description: `Stage "${newStage.name}" has been created`,
        });
      }
    } catch (error) {
      console.error("Error saving stage:", error);
      toast({
        title: "Error",
        description: "Failed to save stage",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsStageDialogOpen(false);
    }
  };

  // Move stage up or down
  const moveStage = async (processId: string, stageId: string, direction: 'up' | 'down') => {
    try {
      const processStages = [...stages[processId]].sort((a, b) => a.order - b.order);
      const stageIndex = processStages.findIndex(stage => stage.id === stageId);
      
      if (direction === 'up' && stageIndex > 0) {
        // Swap with the previous stage
        const newOrder = [...processStages];
        [newOrder[stageIndex].order, newOrder[stageIndex - 1].order] = 
          [newOrder[stageIndex - 1].order, newOrder[stageIndex].order];
          
        // Update local state
        setStages({
          ...stages,
          [processId]: newOrder
        });
        
        // Mark this process's stages as changed
        setStagesOrderChanged({
          ...stagesOrderChanged,
          [processId]: true
        });
      } else if (direction === 'down' && stageIndex < processStages.length - 1) {
        // Swap with the next stage
        const newOrder = [...processStages];
        [newOrder[stageIndex].order, newOrder[stageIndex + 1].order] = 
          [newOrder[stageIndex + 1].order, newOrder[stageIndex].order];
          
        // Update local state
        setStages({
          ...stages,
          [processId]: newOrder
        });
        
        // Mark this process's stages as changed
        setStagesOrderChanged({
          ...stagesOrderChanged,
          [processId]: true
        });
      }
    } catch (error) {
      console.error("Error moving stage:", error);
      toast({
        title: "Error",
        description: "Failed to reorder stages",
        variant: "destructive",
      });
    }
  };

  // Save all changes (reorder processes and stages)
  const saveAllChanges = async () => {
    try {
      setSaving(true);
      
      // Save any stage order changes to Firestore
      const stageOrderPromises = Object.entries(stagesOrderChanged)
        .filter(([_, changed]) => changed)
        .map(async ([processId]) => {
          const orderedStages = [...stages[processId]].sort((a, b) => a.order - b.order);
          const stageIds = orderedStages.map(stage => stage.id);
          return leadProcessService.reorderStages(processId, stageIds);
        });
      
      await Promise.all(stageOrderPromises);
      
      // Reset changed flags
      setStagesOrderChanged({});
      
      toast({
        title: "All changes saved",
        description: "Your changes have been saved successfully",
      });
    } catch (error) {
      console.error("Error saving all changes:", error);
      toast({
        title: "Error",
        description: "Failed to save all changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageTemplate
      title="Leads Settings"
      description="Configure lead processes and stages"
    >
      <div className="mb-8">
        <div className="bg-blue-500 text-white p-4 rounded-md shadow-md w-96">
          <h2 className="text-3xl font-bold mb-1">{processes.length}</h2>
          <div className="flex justify-between items-center">
            <p>Lead Processes</p>
            <Button 
              variant="ghost" 
              className="text-white border border-white hover:bg-blue-600"
              size="sm"
              onClick={() => openProcessDialog()}
              disabled={loading || saving}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Process
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-md shadow-md p-8 text-center">
          <p className="text-gray-500">Loading processes and stages...</p>
        </div>
      )}

      {/* Processes and Stages */}
      {!loading && (
        <div className="space-y-6">
          {processes.map((process) => (
            <div key={process.id} className="bg-white rounded-md shadow-md overflow-hidden">
              {/* Process Header */}
              <div className="flex justify-between items-center bg-gray-50 p-4 border-b">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 mr-2"
                    onClick={() => toggleProcessExpansion(process.id)}
                  >
                    {expandedProcesses.includes(process.id) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                  <div>
                    <h3 className="text-lg font-medium">{process.name}</h3>
                    <p className="text-sm text-gray-500">{process.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openProcessDialog(process)}
                    disabled={saving}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => openDeleteDialog("process", process.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <Switch 
                    checked={process.isActive} 
                    onCheckedChange={() => toggleProcessStatus(process.id)}
                    disabled={saving}
                  />
                </div>
              </div>
              
              {/* Process Stages */}
              {expandedProcesses.includes(process.id) && (
                <div className="p-4">
                  <div className="flex justify-between mb-4">
                    <h4 className="text-md font-medium">Process Stages</h4>
                    <Button 
                      size="sm" 
                      onClick={() => openStageDialog(process.id)}
                      disabled={saving}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Stage
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">Order</TableHead>
                        <TableHead>Stage Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Color</TableHead>
                        <TableHead className="w-28 text-center">Status</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages[process.id]?.sort((a, b) => a.order - b.order).map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell>{stage.order}</TableCell>
                          <TableCell className="font-medium">{stage.name}</TableCell>
                          <TableCell>{stage.description}</TableCell>
                          <TableCell>
                            <div className={`w-6 h-6 rounded-full bg-${stage.color}-500`}></div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch 
                              checked={stage.isActive} 
                              onCheckedChange={() => toggleStageStatus(process.id, stage.id)} 
                              disabled={saving}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="bg-blue-500 hover:bg-blue-600 text-xs"
                                onClick={() => openStageDialog(process.id, stage)}
                                disabled={saving}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="bg-red-500 hover:bg-red-600 text-xs"
                                onClick={() => openDeleteDialog("stage", stage.id)}
                                disabled={saving}
                              >
                                Delete
                              </Button>
                              <div className="flex flex-col space-y-1 ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveStage(process.id, stage.id, 'up')}
                                  disabled={saving || stage.order === 1}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveStage(process.id, stage.id, 'down')}
                                  disabled={saving || stage.order === stages[process.id].length}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!stages[process.id] || stages[process.id].length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                            No stages defined yet. Click "Add Stage" to create your first stage.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}

          {processes.length === 0 && !loading && (
            <div className="bg-white rounded-md shadow-md p-8 text-center">
              <p className="text-gray-500 mb-4">No lead processes defined yet.</p>
              <Button 
                onClick={() => openProcessDialog()}
                className="bg-blue-500 hover:bg-blue-600"
                disabled={saving}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Your First Process
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProcess ? "Edit Process" : "Add New Process"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="processName">Process Name</Label>
              <Input 
                id="processName" 
                value={newProcess.name} 
                onChange={(e) => setNewProcess({...newProcess, name: e.target.value})}
                placeholder="e.g., Nursing Registration"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processDescription">Description</Label>
              <Textarea 
                id="processDescription" 
                value={newProcess.description} 
                onChange={(e) => setNewProcess({...newProcess, description: e.target.value})}
                placeholder="Brief description of this process"
                rows={3}
                disabled={saving}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="processActive">Active</Label>
              <Switch 
                id="processActive" 
                checked={newProcess.isActive} 
                onCheckedChange={(checked) => setNewProcess({...newProcess, isActive: checked})}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button 
              onClick={saveProcess}
              disabled={!newProcess.name || saving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {saving ? "Saving..." : (selectedProcess ? "Update Process" : "Add Process")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Stage Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedStage ? "Edit Stage" : "Add New Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input 
                id="stageName" 
                value={newStage.name} 
                onChange={(e) => setNewStage({...newStage, name: e.target.value})}
                placeholder="e.g., Document Collection"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageDescription">Description</Label>
              <Textarea 
                id="stageDescription" 
                value={newStage.description} 
                onChange={(e) => setNewStage({...newStage, description: e.target.value})}
                placeholder="Brief description of this stage"
                rows={3}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageColor">Color</Label>
              <Select 
                value={newStage.color} 
                onValueChange={(value) => setNewStage({...newStage, color: value})}
                disabled={saving}
              >
                <SelectTrigger id="stageColor">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full bg-${newStage.color}-500`}></div>
                    <SelectValue placeholder="Select color" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-${color.value}-500`}></div>
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="stageActive">Active</Label>
              <Switch 
                id="stageActive" 
                checked={newStage.isActive} 
                onCheckedChange={(checked) => setNewStage({...newStage, isActive: checked})}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button 
              onClick={saveStage}
              disabled={!newStage.name || saving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {saving ? "Saving..." : (selectedStage ? "Update Stage" : "Add Stage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete this {deleteType}? 
              {deleteType === "process" && " All associated stages will also be deleted."}
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleDelete}
              variant="destructive"
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save All Changes Button */}
      <div className="mt-6 flex justify-end">
        <Button 
          variant="default" 
          className="bg-blue-500 hover:bg-blue-600"
          onClick={saveAllChanges}
          disabled={loading || saving || Object.values(stagesOrderChanged).every(changed => !changed)}
        >
          {saving ? "Saving..." : (
            Object.values(stagesOrderChanged).some(changed => changed) 
              ? "Save Stage Order Changes" 
              : "Save All Changes"
          )}
        </Button>
      </div>
    </SettingsPageTemplate>
  );
};

export default LeadsSettings;
