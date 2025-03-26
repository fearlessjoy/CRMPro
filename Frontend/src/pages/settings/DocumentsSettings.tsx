import { useState, useEffect } from "react";
import { SettingsPageTemplate } from "@/components/settings/SettingsPageTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DocumentRequirement, createDocumentRequirement, updateDocumentRequirement, deleteDocumentRequirement, getDocumentRequirementsByProcessAndStage } from "@/services/documentService";
import { Process, Stage, getAllProcesses, getStagesByProcess } from "@/services/leadProcessService";

const DocumentsSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [stages, setStages] = useState<Record<string, Stage[]>>({});
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<DocumentRequirement | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    required: true,
    fileTypes: [] as string[],
    maxSizeInMB: 10,
    processId: "",
    stageId: ""
  });

  // Load processes and stages
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load processes
        const processesData = await getAllProcesses();
        setProcesses(processesData);
        
        // Load stages for each process
        const stagesMap: Record<string, Stage[]> = {};
        await Promise.all(
          processesData.map(async (process) => {
            const processStages = await getStagesByProcess(process.id);
            stagesMap[process.id] = processStages;
          })
        );
        
        setStages(stagesMap);
      } catch (error) {
        console.error("Error loading processes and stages:", error);
        toast({
          title: "Error",
          description: "Failed to load processes and stages",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Load document requirements when process or stage changes
  useEffect(() => {
    const loadRequirements = async () => {
      if (!selectedProcess || !selectedStage) {
        setRequirements([]);
        return;
      }

      try {
        const reqs = await getDocumentRequirementsByProcessAndStage(selectedProcess, selectedStage);
        setRequirements(reqs);
      } catch (error) {
        console.error("Error loading document requirements:", error);
        toast({
          title: "Error",
          description: "Failed to load document requirements",
          variant: "destructive",
        });
      }
    };

    loadRequirements();
  }, [selectedProcess, selectedStage, toast]);

  // Handle process selection
  const handleProcessChange = (processId: string) => {
    setSelectedProcess(processId);
    setSelectedStage("");
    setFormData(prev => ({
      ...prev,
      processId,
      stageId: ""
    }));
  };

  // Handle stage selection
  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    setFormData(prev => ({
      ...prev,
      stageId
    }));
  };

  // Open dialog for creating/editing requirement
  const openDialog = (requirement?: DocumentRequirement) => {
    if (requirement) {
      setSelectedRequirement(requirement);
      setFormData({
        name: requirement.name,
        description: requirement.description,
        required: requirement.required,
        fileTypes: requirement.fileTypes,
        maxSizeInMB: requirement.maxSizeInMB,
        processId: requirement.processId,
        stageId: requirement.stageId
      });
      setSelectedProcess(requirement.processId);
      setSelectedStage(requirement.stageId);
    } else {
      setSelectedRequirement(null);
      setFormData({
        name: "",
        description: "",
        required: true,
        fileTypes: ["pdf", "jpg", "png"],
        maxSizeInMB: 10,
        processId: selectedProcess,
        stageId: selectedStage
      });
    }
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!formData.processId || !formData.stageId) {
        toast({
          title: "Validation Error",
          description: "Please select both process and stage",
          variant: "destructive",
        });
        return;
      }

      if (!formData.name) {
        toast({
          title: "Validation Error",
          description: "Name is required",
          variant: "destructive",
        });
        return;
      }

      if (selectedRequirement) {
        // Update existing requirement
        await updateDocumentRequirement(selectedRequirement.id, formData);
        toast({
          title: "Success",
          description: "Document requirement updated successfully",
        });
      } else {
        // Create new requirement
        await createDocumentRequirement(formData);
        toast({
          title: "Success",
          description: "Document requirement created successfully",
        });
      }

      setIsDialogOpen(false);
      
      // Refresh requirements list
      const updatedReqs = await getDocumentRequirementsByProcessAndStage(formData.processId, formData.stageId);
      setRequirements(updatedReqs);
    } catch (error) {
      console.error("Error saving document requirement:", error);
      toast({
        title: "Error",
        description: "Failed to save document requirement",
        variant: "destructive",
      });
    }
  };

  // Handle requirement deletion
  const handleDelete = async (requirementId: string) => {
    if (window.confirm("Are you sure you want to delete this requirement?")) {
      try {
        await deleteDocumentRequirement(requirementId);
        toast({
          title: "Success",
          description: "Document requirement deleted successfully",
        });
        
        // Refresh requirements list
        if (selectedProcess && selectedStage) {
          const updatedReqs = await getDocumentRequirementsByProcessAndStage(selectedProcess, selectedStage);
          setRequirements(updatedReqs);
        }
      } catch (error) {
        console.error("Error deleting document requirement:", error);
        toast({
          title: "Error",
          description: "Failed to delete document requirement",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <SettingsPageTemplate
      title="Documents Checklist"
      description="Manage document requirements for different lead stages"
    >
      <div className="space-y-6">
        {/* Process and Stage Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Process</Label>
            <Select value={selectedProcess} onValueChange={handleProcessChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a process" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select 
              value={selectedStage} 
              onValueChange={handleStageChange}
              disabled={!selectedProcess}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stages[selectedProcess]?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Document Requirements</h3>
            <Button onClick={() => openDialog()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Requirement
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>File Types</TableHead>
                <TableHead>Max Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.name}</TableCell>
                  <TableCell>{req.description}</TableCell>
                  <TableCell>
                    <Badge variant={req.required ? "default" : "secondary"}>
                      {req.required ? "Required" : "Optional"}
                    </Badge>
                  </TableCell>
                  <TableCell>{req.fileTypes.join(", ")}</TableCell>
                  <TableCell>{req.maxSizeInMB}MB</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(req)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(req.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRequirement ? "Edit Requirement" : "Add Requirement"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter requirement name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter requirement description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileTypes">Allowed File Types</Label>
                <Input
                  id="fileTypes"
                  value={formData.fileTypes.join(", ")}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    fileTypes: e.target.value.split(",").map(t => t.trim()) 
                  }))}
                  placeholder="pdf, jpg, png"
                />
                <p className="text-sm text-gray-500">
                  Enter file extensions separated by commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSize">Maximum File Size (MB)</Label>
                <Input
                  id="maxSize"
                  type="number"
                  value={formData.maxSizeInMB}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxSizeInMB: parseInt(e.target.value) || 0 
                  }))}
                  min="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    required: checked 
                  }))}
                />
                <Label htmlFor="required">Required Document</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedRequirement ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsPageTemplate>
  );
};

export default DocumentsSettings;
