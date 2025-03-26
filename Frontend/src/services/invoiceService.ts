import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase/config";

// Types
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  amount: number;
  taxRate: number;  // Tax rate percentage for this item
  taxAmount: number; // Calculated tax amount for this item
  isTaxable: boolean; // Whether this item is taxable or not
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  leadId: string;
  items: InvoiceItem[];
  subtotal: number;
  // taxRate is now optional since tax is applied per item
  taxRate?: number;
  taxAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  dueDate: Timestamp;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Collection name
const INVOICES_COLLECTION = "invoices";

// Get all invoices
export const getAllInvoices = async (): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
  } catch (error) {
    console.error("Error getting invoices:", error);
    throw error;
  }
};

// Get invoice by ID
export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    const invoiceDoc = await getDoc(doc(db, INVOICES_COLLECTION, invoiceId));
    
    if (invoiceDoc.exists()) {
      return { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting invoice:", error);
    throw error;
  }
};

// Create a new invoice
export const createInvoice = async (
  invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>
): Promise<Invoice> => {
  try {
    // Generate a unique invoice number (using timestamp + random string)
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const invoiceNumber = `INV-${timestamp.toString().slice(-6)}-${randomStr}`;
    
    const newInvoiceRef = doc(collection(db, INVOICES_COLLECTION));
    
    const newInvoice = {
      ...invoiceData,
      invoiceNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(newInvoiceRef, newInvoice);
    
    // Get the invoice with the newly created ID
    const createdInvoiceDoc = await getDoc(newInvoiceRef);
    
    return { id: createdInvoiceDoc.id, ...createdInvoiceDoc.data() } as Invoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
};

// Update invoice
export const updateInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>): Promise<void> => {
  try {
    await updateDoc(doc(db, INVOICES_COLLECTION, invoiceId), {
      ...invoiceData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INVOICES_COLLECTION, invoiceId));
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

// Update invoice status
export const updateInvoiceStatus = async (
  invoiceId: string, 
  status: Invoice['status']
): Promise<void> => {
  try {
    await updateDoc(doc(db, INVOICES_COLLECTION, invoiceId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    throw error;
  }
};

// Get invoices by lead ID
export const getInvoicesByLeadId = async (leadId: string): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where("leadId", "==", leadId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
  } catch (error) {
    console.error("Error getting invoices by lead ID:", error);
    throw error;
  }
};

// Get invoices by status
export const getInvoicesByStatus = async (status: Invoice['status']): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
  } catch (error) {
    console.error("Error getting invoices by status:", error);
    throw error;
  }
};

// Get invoices by creator
export const getInvoicesByCreator = async (creatorId: string): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where("createdBy", "==", creatorId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
  } catch (error) {
    console.error("Error getting invoices by creator:", error);
    throw error;
  }
}; 