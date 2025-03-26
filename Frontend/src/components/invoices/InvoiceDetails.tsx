import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Invoice } from "@/services/invoiceService";
import { FileDown, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

interface InvoiceDetailsProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Available tax rate labels - matches those in CreateInvoiceModal
const TAX_RATE_LABELS: Record<number, string> = {
  0: "0%",
  15: "15%",
  18: "18%"
};

const InvoiceDetails = ({ invoice, open, onOpenChange }: InvoiceDetailsProps) => {
  if (!invoice) return null;

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
      
      // If it's an object with toDate method
      const hasToDate = typeof timestamp === 'object' && 
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-content");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleDownload = () => {
    alert("PDF download functionality would be implemented here with a library like jsPDF");
  };

  // Get tax rate label by value, or return formatted percentage if not in predefined rates
  const getTaxRateLabel = (rate: number) => {
    return TAX_RATE_LABELS[rate] || `${rate}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Invoice #{invoice.invoiceNumber}</span>
            <Badge variant={getStatusBadgeVariant(invoice.status) as any}>
              {invoice.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div id="invoice-print-content" className="space-y-6 py-4">
          {/* Invoice Header */}
          <div className="flex justify-between">
            <div>
              <h3 className="font-bold text-lg">INVOICE</h3>
              <p>Invoice #: {invoice.invoiceNumber}</p>
              <p>Created: {formatDate(invoice.createdAt)}</p>
              <p>Due Date: {formatDate(invoice.dueDate)}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg">CRM Pro</h3>
              <p>123 Business Street</p>
              <p>Business City, 12345</p>
              <p>contact@crmpro.com</p>
            </div>
          </div>

          <Separator />

          {/* From/To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">From:</h4>
              <p className="font-bold">CRM Pro</p>
              <p>123 Business Street</p>
              <p>Business City, 12345</p>
              <p>contact@crmpro.com</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">To:</h4>
              <p className="font-bold">{invoice.customerName || "N/A"}</p>
              <p>{invoice.customerEmail || "N/A"}</p>
              {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
              {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
            </div>
          </div>

          <Separator />

          {/* Invoice Items */}
          <div>
            <h4 className="font-medium mb-4">Invoice Items</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-right">Qty</th>
                    <th className="border p-2 text-right">Price</th>
                    <th className="border p-2 text-right">Amount</th>
                    <th className="border p-2 text-right">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.description}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                      <td className="border p-2 text-right">${item.price.toFixed(2)}</td>
                      <td className="border p-2 text-right">${item.amount.toFixed(2)}</td>
                      <td className="border p-2 text-right">
                        {item.isTaxable ? (
                          <>
                            {getTaxRateLabel(item.taxRate)} (${item.taxAmount.toFixed(2)})
                          </>
                        ) : (
                          "Non-taxable"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-1/2 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amount:</span>
                <span>${invoice.taxAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </>
          )}

          {invoice.terms && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Terms and Conditions</h4>
                <p className="whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetails; 