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
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "@/firebase/config";

// Types
export interface LeadStageHistory {
  stageId: string;
  processId: string;
  timestamp: Timestamp;
  notes?: string;
  updatedBy?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  source?: string;
  status?: 'active' | 'inactive' | 'converted' | 'lost';
  notes?: string;
  assignedTo?: string;
  createdAt?: any;
  updatedAt?: any;
  currentProcessId?: string;
  currentStageId?: string;
  portalCode?: string;
  stageHistory: LeadStageHistory[];
  createdBy: string;
}

// Collection name
const LEADS_COLLECTION = "leads";
const NOTES_COLLECTION = "notes";

// Get all leads
export const getAllLeads = async (): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting leads:", error);
    throw error;
  }
};

// Get lead by ID
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
  try {
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    
    if (leadDoc.exists()) {
      return { id: leadDoc.id, ...leadDoc.data() } as Lead;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting lead:", error);
    throw error;
  }
};

// Create a new lead
export const createLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>): Promise<Lead> => {
  try {
    const newLeadRef = doc(collection(db, LEADS_COLLECTION));
    
    const newLead = {
      ...leadData,
      stageHistory: [], // Initialize with empty stage history
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(newLeadRef, newLead);
    
    // Get the lead with the newly created ID
    const createdLeadDoc = await getDoc(newLeadRef);
    
    return { id: createdLeadDoc.id, ...createdLeadDoc.data() } as Lead;
  } catch (error) {
    console.error("Error creating lead:", error);
    throw error;
  }
};

// Update lead
export const updateLead = async (leadId: string, leadData: Partial<Lead>): Promise<void> => {
  try {
    await updateDoc(doc(db, LEADS_COLLECTION, leadId), {
      ...leadData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating lead:", error);
    throw error;
  }
};

// Delete lead
export const deleteLead = async (leadId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, LEADS_COLLECTION, leadId));
  } catch (error) {
    console.error("Error deleting lead:", error);
    throw error;
  }
};

// Import leads from CSV data
export const importLeadsFromCSV = async (leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>>): Promise<number> => {
  try {
    const batch = writeBatch(db);
    let importCount = 0;
    
    for (const leadData of leads) {
      const newLeadRef = doc(collection(db, LEADS_COLLECTION));
      
      const newLead = {
        ...leadData,
        status: 'active',
        stageHistory: [], // Initialize with empty stage history
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: leadData.createdBy || 'import'
      };
      
      batch.set(newLeadRef, newLead);
      importCount++;
    }
    
    await batch.commit();
    return importCount;
  } catch (error) {
    console.error("Error importing leads:", error);
    throw error;
  }
};

// Assign process to lead
export const assignProcessToLead = async (leadId: string, processId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, LEADS_COLLECTION, leadId), {
      currentProcessId: processId,
      currentStageId: null, // Reset stage when changing process
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error assigning process to lead:", error);
    throw error;
  }
};

// Update lead stage
export const updateLeadStage = async (
  leadId: string, 
  stageId: string, 
  processId: string,
  notes?: string,
  updatedBy?: string
): Promise<void> => {
  try {
    console.log(`Updating lead ${leadId} to stage ${stageId} in process ${processId}`);

    // Get current lead data
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (!leadDoc.exists()) {
      throw new Error("Lead not found");
    }
    
    const leadData = leadDoc.data() as Omit<Lead, 'id'>;
    
    // Create history entry
    const historyEntry: LeadStageHistory = {
      stageId,
      processId,
      timestamp: Timestamp.now(),
      notes,
      updatedBy
    };
    
    // Log the current state and what we're updating to
    console.log(`Current lead state: processId=${leadData.currentProcessId}, stageId=${leadData.currentStageId}`);
    console.log(`Updating to: processId=${processId}, stageId=${stageId}`);
    
    // Ensure stageHistory exists
    const stageHistory = leadData.stageHistory || [];
    
    // Prepare the update object
    const updateData = {
      currentStageId: stageId,
      currentProcessId: processId,
      stageHistory: [...stageHistory, historyEntry],
      updatedAt: serverTimestamp()
    };
    
    // Update the lead with new stage and add to history
    await updateDoc(doc(db, LEADS_COLLECTION, leadId), updateData);
    
    console.log(`Successfully updated lead ${leadId} stage to ${stageId}`);
    
    // Double-check the update was successful
    const updatedLeadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (updatedLeadDoc.exists()) {
      const updatedData = updatedLeadDoc.data();
      console.log(`Verification - lead now has: processId=${updatedData.currentProcessId}, stageId=${updatedData.currentStageId}`);
    }
  } catch (error) {
    console.error("Error updating lead stage:", error);
    throw error;
  }
};

// Get leads by assigned user
export const getLeadsByAssignedUser = async (userId: string): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      where("assignedTo", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting leads by assigned user:", error);
    throw error;
  }
};

// Get leads by status
export const getLeadsByStatus = async (status: Lead['status']): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting leads by status:", error);
    throw error;
  }
};

// Get leads by process
export const getLeadsByProcess = async (processId: string): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      where("currentProcessId", "==", processId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting leads by process:", error);
    throw error;
  }
};

// Get leads by stage
export const getLeadsByStage = async (stageId: string): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      where("currentStageId", "==", stageId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting leads by stage:", error);
    throw error;
  }
};

// Get recent leads
export const getRecentLeads = async (count: number = 10): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error("Error getting recent leads:", error);
    throw error;
  }
};

// Get notes for a lead
export const getLeadNotes = async (leadId: string): Promise<Note[]> => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION, leadId, NOTES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Note[];
  } catch (error) {
    console.error("Error getting lead notes:", error);
    throw error;
  }
};

// Add a note to a lead
export const addLeadNote = async (leadId: string, content: string, createdBy: string = "System"): Promise<Note> => {
  try {
    const noteRef = doc(collection(db, LEADS_COLLECTION, leadId, NOTES_COLLECTION));
    
    const noteData = {
      content,
      createdAt: serverTimestamp(),
      createdBy
    };
    
    await setDoc(noteRef, noteData);
    
    // Return the newly created note
    return { 
      id: noteRef.id,
      ...noteData,
      createdAt: Timestamp.now() // Provide a timestamp for immediate use since serverTimestamp isn't available right away
    };
  } catch (error) {
    console.error("Error adding lead note:", error);
    throw error;
  }
};

// Delete a note from a lead
export const deleteLeadNote = async (leadId: string, noteId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, LEADS_COLLECTION, leadId, NOTES_COLLECTION, noteId));
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
}; 