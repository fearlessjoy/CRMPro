import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lead } from "@/services/leadService";
import { Invoice, InvoiceItem, createInvoice } from "@/services/invoiceService";
import { Plus, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

// Available tax rates
const TAX_RATES = [
  { value: 0, label: "0%" },
  { value: 15, label: "15%" },
  { value: 18, label: "18%" }
];

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onInvoiceCreated: () => void;
}

const CreateInvoiceModal = ({ 
  open, 
  onOpenChange, 
  lead, 
  onInvoiceCreated 
}: CreateInvoiceModalProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Default tax rate for new items (18% GST)
  const [defaultTaxRate, setDefaultTaxRate] = useState(18);
  
  // Invoice data
  const [items, setItems] = useState<InvoiceItem[]>([
    { 
      id: "1", 
      description: "", 
      quantity: 1, 
      price: 0, 
      amount: 0,
      taxRate: defaultTaxRate,
      taxAmount: 0,
      isTaxable: true
    }
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 30 days of invoice date.");
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default due date is 30 days from now
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });
  
  // Calculate totals when items change
  useEffect(() => {
    const newSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const newTaxAmount = items.reduce((sum, item) => sum + (item.isTaxable ? item.taxAmount : 0), 0);
    const newTotal = newSubtotal + newTaxAmount;
    
    setSubtotal(newSubtotal);
    setTaxAmount(newTaxAmount);
    setTotal(newTotal);
  }, [items]);
  
  // Update item calculations when quantity, price, or tax settings change
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount if quantity or price changes
    if (field === 'quantity' || field === 'price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].price;
      
      // Recalculate tax amount if the item is taxable
      if (newItems[index].isTaxable) {
        newItems[index].taxAmount = (newItems[index].amount * newItems[index].taxRate) / 100;
      }
    }
    
    // Recalculate tax amount if tax rate changes
    if (field === 'taxRate') {
      if (newItems[index].isTaxable) {
        newItems[index].taxAmount = (newItems[index].amount * newItems[index].taxRate) / 100;
      }
    }
    
    // Handle toggling taxable status
    if (field === 'isTaxable') {
      if (value) {
        // If becoming taxable, calculate tax amount
        newItems[index].taxAmount = (newItems[index].amount * newItems[index].taxRate) / 100;
      } else {
        // If becoming non-taxable, set tax amount to 0
        newItems[index].taxAmount = 0;
      }
    }
    
    setItems(newItems);
  };
  
  // Add a new item
  const addItem = () => {
    setItems([
      ...items, 
      { 
        id: (items.length + 1).toString(), 
        description: "", 
        quantity: 1, 
        price: 0, 
        amount: 0,
        taxRate: defaultTaxRate,
        taxAmount: 0,
        isTaxable: true
      }
    ]);
  };
  
  // Remove an item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  
  // Update the default tax rate and apply to all taxable items
  const updateDefaultTaxRate = (rate: number) => {
    setDefaultTaxRate(rate);
    
    // Ask if user wants to apply to all existing items
    if (items.length > 0) {
      const confirmed = window.confirm("Would you like to apply this tax rate to all taxable items?");
      if (confirmed) {
        const newItems = items.map(item => {
          if (item.isTaxable) {
            const taxAmount = (item.amount * rate) / 100;
            return { ...item, taxRate: rate, taxAmount };
          }
          return item;
        });
        setItems(newItems);
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create invoices",
        variant: "destructive",
      });
      return;
    }
    
    // Validate form
    if (items.some(item => !item.description)) {
      toast({
        title: "Validation Error",
        description: "All items must have a description",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare invoice data - ensure no undefined values
      const invoiceData = {
        customerName: lead.name || "",
        customerEmail: lead.email || "",
        customerPhone: lead.phone || "",
        customerAddress: lead.address || "",
        leadId: lead.id,
        items,
        subtotal,
        taxAmount,
        total,
        notes,
        terms,
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        status: 'pending' as const,
        createdBy: currentUser.uid,
      };
      
      // Create invoice in Firestore
      await createInvoice(invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      // Close modal and notify parent
      onOpenChange(false);
      onInvoiceCreated();
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice for lead {lead.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Name</Label>
                <Input 
                  id="customerName" 
                  value={lead.name} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input 
                  id="customerEmail" 
                  value={lead.email} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input 
                  id="customerPhone" 
                  value={lead.phone || ""} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Address</Label>
                <Input 
                  id="customerAddress" 
                  value={lead.address || ""} 
                  disabled 
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Default Tax Rate Setting */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="defaultTaxRate">Default Tax Rate for New Items</Label>
              <div className="w-40">
                <Select
                  value={defaultTaxRate.toString()}
                  onValueChange={(value) => updateDefaultTaxRate(Number(value))}
                >
                  <SelectTrigger id="defaultTaxRate">
                    <SelectValue placeholder="Select tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              This rate will be applied to new items by default. You can adjust tax rates per item below.
            </p>
          </div>
          
          <Separator />
          
          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Invoice Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Description</TableHead>
                  <TableHead className="w-[10%]">Quantity</TableHead>
                  <TableHead className="w-[15%]">Price</TableHead>
                  <TableHead className="w-[15%]">Amount</TableHead>
                  <TableHead className="w-[10%]">Taxable</TableHead>
                  <TableHead className="w-[10%]">Tax Rate</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.amount.toFixed(2)}
                        disabled
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Switch 
                          checked={item.isTaxable} 
                          onCheckedChange={(checked) => updateItem(index, 'isTaxable', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.taxRate.toString()}
                        onValueChange={(value) => updateItem(index, 'taxRate', Number(value))}
                        disabled={!item.isTaxable}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select tax rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {TAX_RATES.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value.toString()}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Totals */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="w-1/2 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Additional Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes to include on the invoice"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms and Conditions</Label>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceModal; 