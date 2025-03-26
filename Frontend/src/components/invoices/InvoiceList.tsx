import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Invoice, getInvoicesByLeadId, updateInvoiceStatus } from "@/services/invoiceService";
import { Eye, Download, Printer, MoreVertical } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface InvoiceListProps {
  leadId: string;
  onViewInvoice: (invoice: Invoice) => void;
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 hover:bg-green-200",
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  overdue: "bg-red-100 text-red-800 hover:bg-red-200",
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

const InvoiceList = ({ leadId, onViewInvoice }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch invoices when component mounts
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const invoicesData = await getInvoicesByLeadId(leadId);
        setInvoices(invoicesData);
      } catch (error: any) {
        console.error("Error getting invoices by lead ID:", error);
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
  }, [leadId, toast]);

  // Format date helper
  const formatDate = (timestamp: Timestamp | undefined) => {
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

  // Handle status change
  const handleStatusChange = async (invoiceId: string, newStatus: "paid" | "pending" | "overdue") => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      
      // Update local state
      setInvoices(
        invoices.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
        )
      );
      
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

  if (loading) {
    return <div className="p-4 text-center">Loading invoices...</div>;
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No invoices found for this lead</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
              <TableCell>{formatDate(invoice.createdAt)}</TableCell>
              <TableCell>{formatDate(invoice.dueDate)}</TableCell>
              <TableCell className="text-right">${invoice.total.toFixed(2)}</TableCell>
              <TableCell>
                <Badge 
                  variant="outline"
                  className={statusColors[invoice.status]}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewInvoice(invoice)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(invoice.id, "paid")}
                        disabled={invoice.status === "paid"}
                      >
                        Mark as Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(invoice.id, "pending")}
                        disabled={invoice.status === "pending"}
                      >
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(invoice.id, "overdue")}
                        disabled={invoice.status === "overdue"}
                      >
                        Mark as Overdue
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceList; 