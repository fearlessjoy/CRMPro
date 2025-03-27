import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadProcessSelection } from "@/components/leads/LeadProcessSelection";
import { LeadDocuments } from "@/components/leads/LeadDocuments";
import { LeadActivityHistory } from "@/components/leads/LeadActivityHistory";
import { LeadReminders } from "@/components/leads/LeadReminders";
import * as leadService from "@/services/leadService";
import * as leadProcessService from "@/services/leadProcessService";
import * as userService from "@/services/userService";
import { Lead } from "@/services/leadService";
import { Process, Stage } from "@/services/leadProcessService";
import { User } from "@/services/userService";
import { ArrowLeft, Mail, Phone, MapPin, Clock, User as UserIcon, FileText, Plus, Edit, Trash2 } from "lucide-react";
import { Invoice } from "@/services/invoiceService";
import CreateInvoiceModal from "@/components/invoices/CreateInvoiceModal";
import InvoiceList from "@/components/invoices/InvoiceList";
import InvoiceDetails from "@/components/invoices/InvoiceDetails";
import { DocumentRequirementsBadge } from "@/components/leads/DocumentRequirementsBadge";
import { Timestamp } from "firebase/firestore";
import { SendPortalAccess } from "@/components/leads/SendPortalAccess";
import { LeadMessages } from "@/components/leads/LeadMessages";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LeadDetail = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<{ [key: string]: Process & { stages: { [key: string]: Stage } } }>({});
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Add state for edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    source: "",
    assignedTo: "unassigned"
  });
  
  // Invoice state
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  const [refreshInvoices, setRefreshInvoices] = useState(0);
  const [assignedUserName, setAssignedUserName] = useState<string>("Unassigned");
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isPortalAccessDialogOpen, setIsPortalAccessDialogOpen] = useState(false);
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Array<{ id: string; content: string; createdAt: any; createdBy: string }>>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; content: string } | null>(null);
  const [noteAuthors, setNoteAuthors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadData = async () => {
      if (!leadId) {
        navigate("/leads");
        return;
      }

      try {
        setLoading(true);
        const [leadData, processesData, usersData] = await Promise.all([
          leadService.getLeadById(leadId),
          leadProcessService.getAllProcesses(),
          userService.getAllUsers()
        ]);
        
        setUsers(usersData);
        
        if (leadData) {
          setLead(leadData);
          
          // Load stages for each process
          const processesWithStages = await Promise.all(
            processesData.map(async (process) => {
              const stages = await leadProcessService.getStagesByProcess(process.id);
              return {
                ...process,
                stages: stages.reduce((acc, stage) => ({
                  ...acc,
                  [stage.id]: stage
                }), {})
              };
            })
          );

          // Convert to object format
          const processesObj = processesWithStages.reduce((acc, process) => ({
            ...acc,
            [process.id]: process
          }), {});
          
          console.log('Processes loaded:', JSON.stringify(processesObj, null, 2)); // Debug log
          setProcesses(processesObj);
        } else {
          toast({
            title: "Lead not found",
            description: "The requested lead could not be found",
            variant: "destructive",
          });
          navigate("/leads");
        }
      } catch (error) {
        console.error("Error loading lead data:", error);
        toast({
          title: "Error",
          description: "Failed to load lead data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, navigate, toast]);

  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        address: lead.address || "",
        source: lead.source || "",
        assignedTo: lead.assignedTo || "unassigned"
      });
    }
  }, [lead]);

  useEffect(() => {
    const fetchAssignedUserName = async () => {
      if (lead?.assignedTo) {
        try {
          const user = await userService.getUserById(lead.assignedTo);
          if (user) {
            setAssignedUserName(user.displayName || user.email || user.name || "Unknown User");
          }
        } catch (error) {
          console.error("Error fetching assigned user:", error);
          setAssignedUserName("Unknown User");
        }
      } else {
        setAssignedUserName("Unassigned");
      }
    };

    fetchAssignedUserName();
  }, [lead?.assignedTo]);

  useEffect(() => {
    const calculateProgress = () => {
      if (!lead?.currentProcessId || !processes[lead.currentProcessId]) return 0;
      
      const currentProcess = processes[lead.currentProcessId];
      const stages = Object.values(currentProcess.stages);
      if (stages.length === 0) return 0;
      
      // If no current stage, progress is 0
      if (!lead.currentStageId) return 0;
      
      // Find the index of the current stage
      const sortedStages = stages.sort((a, b) => a.order - b.order);
      const currentStageIndex = sortedStages.findIndex(stage => stage.id === lead.currentStageId);
      
      if (currentStageIndex === -1) return 0;
      
      // Calculate percentage based on current stage position
      return Math.round(((currentStageIndex + 1) / stages.length) * 100);
    };

    const progress = calculateProgress();
    setProgressPercentage(progress);
  }, [lead?.currentProcessId, lead?.currentStageId, processes]);

  useEffect(() => {
    const loadNotes = async () => {
      if (!leadId) return;
      try {
        const fetchedNotes = await leadService.getLeadNotes(leadId);
        setNotes(fetchedNotes || []);
      } catch (error) {
        console.error("Error loading notes:", error);
        toast({
          title: "Error",
          description: "Failed to load notes",
          variant: "destructive",
        });
      }
    };
    loadNotes();
  }, [leadId]);

  useEffect(() => {
    const fetchNoteAuthors = async () => {
      const authorEmails = [...new Set(notes.map(note => note.createdBy))];
      const authors: { [key: string]: string } = {};

      for (const email of authorEmails) {
        if (email === "System") {
          authors[email] = "System";
          continue;
        }

        try {
          // Find user in the already loaded users array first
          const existingUser = users.find(user => user.email === email);
          if (existingUser) {
            authors[email] = existingUser.displayName || existingUser.name || email;
          } else {
            // If not found in loaded users, try to fetch from userService
            const user = await userService.getUserByEmail(email);
            if (user) {
              authors[email] = user.displayName || user.name || email;
            } else {
              authors[email] = email;
            }
          }
        } catch (error) {
          console.error(`Error fetching user details for ${email}:`, error);
          authors[email] = email;
        }
      }

      setNoteAuthors(authors);
    };

    if (notes.length > 0) {
      fetchNoteAuthors();
    }
  }, [notes, users]);

  const handleProcessSelected = async (processId: string) => {
    if (!lead) return;
    
    // Update local lead state
    setLead({
      ...lead,
      currentProcessId: processId,
      currentStageId: undefined
    });
  };

  const handleStageChanged = async (stageId: string) => {
    if (!lead) return;
    
    // Update local lead state
    setLead({
      ...lead,
      currentStageId: stageId
    });
  };

  const handleCreateInvoice = () => {
    setCreateInvoiceModalOpen(true);
  };

  const handleInvoiceCreated = () => {
    toast({
      title: "Invoice Created",
      description: "The invoice has been successfully created",
    });
    // Increment to trigger a refresh of the invoice list
    setRefreshInvoices(prev => prev + 1);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDetailsOpen(true);
  };

  const getStatusBadgeColor = (status: Lead['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'converted':
        return 'bg-blue-500';
      case 'lost':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Check if it's a Firestore Timestamp object with toDate method
      const date = timestamp && typeof timestamp.toDate === 'function' 
        ? timestamp.toDate() 
        : new Date(timestamp);
        
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleEditClick = () => {
    setShowEditDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!lead || !leadId) return;

    try {
      // Convert "unassigned" to null or empty string when saving
      const assignedTo = editForm.assignedTo === "unassigned" ? null : editForm.assignedTo;
      
      await leadService.updateLead(leadId, {
        ...lead,
        ...editForm,
        assignedTo,
        updatedAt: Timestamp.fromDate(new Date())
      });

      // Update local state
      setLead(prev => prev ? { 
        ...prev, 
        ...editForm,
        assignedTo 
      } : null);

      toast({
        title: "Success",
        description: "Lead details updated successfully",
      });

      setShowEditDialog(false);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead details",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !leadId) return;
    
    setIsAddingNote(true);
    try {
      await leadService.addLeadNote(leadId, newNote, currentUser?.email || "System");
      setNewNote("");
      setShowAddNoteDialog(false);
      // Refresh notes
      const updatedNotes = await leadService.getLeadNotes(leadId);
      setNotes(updatedNotes || []);
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete || !leadId) return;
    
    try {
      await leadService.deleteLeadNote(leadId, noteToDelete.id);
      // Refresh notes
      const updatedNotes = await leadService.getLeadNotes(leadId);
      setNotes(updatedNotes || []);
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setNoteToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Lead not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/leads')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
          
          <h1 className="text-2xl font-semibold">
            Lead {lead?.name || leadId}
            {lead?.status && (
              <Badge className="ml-2" variant={
                lead.status === 'active' ? 'default' :
                lead.status === 'converted' ? 'outline' :
                'secondary'
              }>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </Badge>
            )}
          </h1>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsPortalAccessDialogOpen(true)}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Send Portal Access
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowEditDialog(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Lead Details
          </Button>
          <Button 
            onClick={handleCreateInvoice}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lead Information Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <span>{lead.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                <span>{lead.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                <span>{lead.address || 'No address provided'}</span>
              </div>
              <div className="flex items-center text-sm">
                <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                <span>Assigned to: {assignedUserName}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Source</h3>
              <p className="text-sm">{lead.source || 'Unknown'}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>Created: {formatDate(lead.createdAt)}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>Updated: {formatDate(lead.updatedAt)}</span>
              </div>
            </div>

            <Separator />

            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleEditClick}
            >
              Edit Lead Details
            </Button>
          </CardContent>
        </Card>
        
        {/* Edit Lead Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Lead Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={editForm.source}
                  onChange={(e) => setEditForm(prev => ({ ...prev, source: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select
                  value={editForm.assignedTo}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.displayName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Lead Process and Activity */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList className="w-full border-b pb-0">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <div className="grid gap-4">
                <LeadProcessSelection 
                  leadId={leadId as string}
                  onProcessSelected={handleProcessSelected}
                  onStageChanged={handleStageChanged}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="documents">
              <LeadDocuments leadId={leadId || ""} />
            </TabsContent>
            
            <TabsContent value="messages">
              {lead && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeadMessages 
                      leadId={leadId || ""} 
                      lead={lead}
                      isLeadPortal={false}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="activity">
              {lead && (
                <LeadActivityHistory
                  stageHistory={lead.stageHistory}
                  processes={processes}
                />
              )}
            </TabsContent>
            
            <TabsContent value="invoices">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Lead Invoices</h3>
                <Button 
                  onClick={handleCreateInvoice}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Create Invoice
                </Button>
              </div>
              
              <InvoiceList 
                leadId={leadId as string} 
                onViewInvoice={handleViewInvoice}
                key={`invoice-list-${refreshInvoices}`} // Force re-render when refreshInvoices changes
              />
            </TabsContent>
            
            <TabsContent value="reminders">
              {lead && (
                <LeadReminders leadId={leadId as string} />
              )}
            </TabsContent>
            
            <TabsContent value="notes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Notes</CardTitle>
                  <Button onClick={() => setShowAddNoteDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No notes yet. Click 'Add Note' to create one.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(note.createdAt)}
                              </span>
                              <span className="text-sm font-medium ml-2">
                                {noteAuthors[note.createdBy] || note.createdBy}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setNoteToDelete({ id: note.id, content: note.content })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="whitespace-pre-line">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invoice Modals */}
      {lead && (
        <CreateInvoiceModal 
          open={createInvoiceModalOpen}
          onOpenChange={setCreateInvoiceModalOpen}
          lead={lead}
          onInvoiceCreated={handleInvoiceCreated}
        />
      )}
      
      <InvoiceDetails 
        invoice={selectedInvoice}
        open={invoiceDetailsOpen}
        onOpenChange={setInvoiceDetailsOpen}
      />

      {/* Send Portal Access Dialog */}
      <Dialog open={isPortalAccessDialogOpen} onOpenChange={setIsPortalAccessDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Send Portal Access</DialogTitle>
          </DialogHeader>
          {lead && (
            <SendPortalAccess 
              lead={lead} 
              onSuccess={() => setIsPortalAccessDialogOpen(false)} 
              onCancel={() => setIsPortalAccessDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddNoteDialog(false)}
              disabled={isAddingNote}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote}
              disabled={isAddingNote || !newNote.trim()}
            >
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="text-sm text-gray-700 line-clamp-3">{noteToDelete?.content}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteNote}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadDetail; 