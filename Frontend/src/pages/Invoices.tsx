import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  Download, 
  FileText, 
  Filter, 
  MoreHorizontal, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Printer,
  Eye,
  User2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Invoice, getAllInvoices, updateInvoiceStatus } from "@/services/invoiceService";
import InvoiceDetails from "@/components/invoices/InvoiceDetails";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 hover:bg-green-200",
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  overdue: "bg-red-100 text-red-800 hover:bg-red-200",
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

const Invoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
  });

  // Load invoices from Firestore
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const fetchedInvoices = await getAllInvoices();
        setInvoices(fetchedInvoices);
        setFilteredInvoices(fetchedInvoices);
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        toast({
          title: "Error loading invoices",
          description: error.message || "Failed to load invoices",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [toast]);

  // Filter invoices based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = invoices.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.customerName.toLowerCase().includes(query) ||
          invoice.customerEmail.toLowerCase().includes(query) ||
          invoice.status.toLowerCase().includes(query)
      );
      setFilteredInvoices(filtered);
    }
  }, [searchQuery, invoices]);

  // Calculate summary statistics
  useEffect(() => {
    const total = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paid = filteredInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const pending = filteredInvoices
      .filter((invoice) => invoice.status === "pending")
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const overdue = filteredInvoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.total, 0);

    setSummaryStats({ total, paid, pending, overdue });
  }, [filteredInvoices]);

  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((invoiceId) => invoiceId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map((invoice) => invoice.id));
    }
  };
  
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDetailsOpen(true);
  };
  
  const handleStatusChange = async (invoiceId: string, newStatus: "paid" | "pending" | "overdue") => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      
      // Update local state
      const updatedInvoices = invoices.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
      );
      
      setInvoices(updatedInvoices);
      
      toast({
        title: "Status updated",
        description: `Invoice status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };
  
  const handleViewLead = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };
  
  const formatDate = (timestamp: Timestamp | unknown) => {
    if (!timestamp) return "N/A";
    
    try {
      // Check if it's a Firestore Timestamp object with toDate method
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      
      // If it's an object with toDate method (like Firestore Timestamp)
      const hasToDate = timestamp && 
        typeof timestamp === 'object' && 
        timestamp !== null && 
        'toDate' in timestamp && 
        typeof (timestamp as any).toDate === 'function';
        
      if (hasToDate) {
        return (timestamp as any).toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      
      // If it's already a Date object or can be converted to one
      const date = new Date(timestamp as any);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage your customer invoices</p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => navigate("/leads")}
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.length} invoices
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summaryStats.paid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "paid").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${summaryStats.pending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "pending").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summaryStats.overdue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "overdue").length} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <div className="border-b bg-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search invoices..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {searchQuery ? 'No invoices match your search.' : 'No invoices found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30">
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User2 className="h-4 w-4 text-muted-foreground" />
                          <span>{invoice.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>${invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={statusColors[invoice.status]}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(invoice.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(invoice.dueDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewLead(invoice.leadId)}>
                              View Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" /> Print Invoice
                            </DropdownMenuItem>
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'paid' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'pending')}>
                                Mark as Pending
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <InvoiceDetails 
        invoice={selectedInvoice}
        open={invoiceDetailsOpen}
        onOpenChange={setInvoiceDetailsOpen}
      />
    </div>
  );
};

export default Invoices;
