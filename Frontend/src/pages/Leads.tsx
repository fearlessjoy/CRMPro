import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import * as leadService from "@/services/leadService";
import { Lead } from "@/services/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { ImportLeadsModal } from "@/components/leads/ImportLeadsModal";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Upload
} from "lucide-react";

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Lead>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // New lead form state
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: ""
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Load leads
  const loadLeads = async () => {
    try {
      setLoading(true);
      const leadsData = await leadService.getAllLeads();
      setLeads(leadsData);
      setFilteredLeads(leadsData);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadLeads();
  }, [toast]);

  // Filter leads based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads(leads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = leads.filter(lead => 
      lead.name.toLowerCase().includes(query) || 
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      (lead.phone && lead.phone.toLowerCase().includes(query))
    );
    
    setFilteredLeads(filtered);
  }, [searchQuery, leads]);

  // Handle sort
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to desc
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort leads
  useEffect(() => {
    const sorted = [...filteredLeads].sort((a, b) => {
      // Handle missing values
      if (!a[sortField] && !b[sortField]) return 0;
      if (!a[sortField]) return 1;
      if (!b[sortField]) return -1;
      
      // Compare based on field type
      let comparison = 0;
      
      if (sortField === "createdAt" || sortField === "updatedAt") {
        // Date comparison - ensure proper conversion from Firestore Timestamp to Date
        // The toDate() method is available on Firestore Timestamp objects
        const dateA = a[sortField] && typeof a[sortField].toDate === 'function' 
          ? a[sortField].toDate() 
          : new Date(a[sortField] as any);
        const dateB = b[sortField] && typeof b[sortField].toDate === 'function'
          ? b[sortField].toDate()
          : new Date(b[sortField] as any);
        
        comparison = dateA.getTime() - dateB.getTime();
      } else {
        // String comparison
        const valueA = String(a[sortField]).toLowerCase();
        const valueB = String(b[sortField]).toLowerCase();
        comparison = valueA.localeCompare(valueB);
      }
      
      // Apply direction
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    setFilteredLeads(sorted);
  }, [sortField, sortDirection]);

  // Create new lead
  const handleCreateLead = async () => {
    try {
      if (!newLead.name || !newLead.email) {
        toast({
          title: "Validation Error",
          description: "Name and email are required",
          variant: "destructive",
        });
        return;
      }
      
      const leadData = {
        ...newLead,
        status: 'active' as const,
        createdBy: currentUser?.uid || 'unknown'
      };
      
      const createdLead = await leadService.createLead(leadData);
      
      // Add to leads list
      setLeads([createdLead, ...leads]);
      
      // Reset form
      setNewLead({
        name: "",
        email: "",
        phone: "",
        source: ""
      });
      
      // Close dialog
      setIsNewLeadDialogOpen(false);
      
      toast({
        title: "Lead created",
        description: `Lead "${createdLead.name}" has been created`,
      });
      
      // Navigate to the new lead's detail page
      navigate(`/leads/${createdLead.id}`);
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead",
        variant: "destructive",
      });
    }
  };

  // Prompt to delete lead
  const confirmDeleteLead = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  // Delete lead
  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    
    try {
      await leadService.deleteLead(leadToDelete.id);
      
      // Remove from state
      setLeads(leads.filter(lead => lead.id !== leadToDelete.id));
      
      toast({
        title: "Lead deleted",
        description: `Lead "${leadToDelete.name}" has been deleted successfully`,
      });
      
      // Close dialog
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    }
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
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleImportComplete = () => {
    loadLeads();
    toast({
      title: "Import Complete",
      description: "Leads have been successfully imported",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <div className="flex gap-3">
          <Button onClick={() => setIsImportLeadsOpen(true)} variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setIsNewLeadDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Leads</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <p>Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No leads found</p>
              <Button 
                onClick={() => setIsNewLeadDialogOpen(true)} 
                variant="outline" 
                className="mt-4"
              >
                Add your first lead
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center">
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link 
                          to={`/leads/${lead.id}`}
                          className="text-blue-500 hover:underline"
                        >
                          {lead.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.email}
                          {lead.phone && (
                            <div className="text-gray-500">{lead.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.source || "Not specified"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(lead.status)}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/leads/${lead.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => confirmDeleteLead(lead)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Lead Dialog */}
      <Dialog open={isNewLeadDialogOpen} onOpenChange={setIsNewLeadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Create a new lead to track in your pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Enter lead's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Input
                id="source"
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                placeholder="e.g., Website, Referral, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateLead}>
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {leadToDelete?.name}'s information and all associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeadToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Leads Dialog */}
      <ImportLeadsModal
        open={isImportLeadsOpen}
        onOpenChange={setIsImportLeadsOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default Leads;
