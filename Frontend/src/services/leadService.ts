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
import * as leadProcessService from "@/services/leadProcessService";
import type { Process, Stage } from "@/services/leadProcessService";

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

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: Date | string;
  completed: boolean;
  assignedTo?: string;
  createdAt: any;
  updatedAt: any;
}

// Add new interface for lead processes
export interface LeadProcess {
  processId: string;
  assignedAt: any; // Timestamp
  isActive: boolean;
}

// Modify Lead interface to include processes
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  source?: string;
  status: 'received' | 'active' | 'followup' | 'converted' | 'dropped';
  notes?: string;
  assignedTo?: string;
  createdAt?: any;
  updatedAt?: any;
  currentProcessId?: string;
  currentStageId?: string;
  portalCode?: string;
  stageHistory: LeadStageHistory[];
  processes?: LeadProcess[]; // Add this field
  tasks?: Task[];
  createdBy: string;
}

// Collection names
const LEADS_COLLECTION = "leads";
const NOTES_COLLECTION = "notes";
const PROCESSES_COLLECTION = "processes";

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
    
    // Ensure Lead Process exists before proceeding
    const leadProcess = await leadProcessService.ensureLeadProcessExists();
    console.log("Lead Process:", leadProcess);
    
    if (!leadProcess) {
      throw new Error("Failed to create or find Lead Process.");
    }
    
    // Get the first stage of the Lead Process
    const stages = await leadProcessService.getStagesByProcess(leadProcess.id);
    console.log("Stages for Lead Process:", stages);
    
    // Find the stage with the lowest order number
    const firstStage = stages.reduce((lowest, current) => {
      if (!lowest || current.order < lowest.order) {
        return current;
      }
      return lowest;
    }, null as Stage | null);
    
    console.log("First Stage (lowest order):", firstStage);
    
    if (!firstStage) {
      throw new Error("No initial stage found for Lead Process.");
    }

    // Create initial process entry
    const initialProcess: LeadProcess = {
      processId: leadProcess.id,
      assignedAt: Timestamp.now(),
      isActive: true
    };
    
    const newLead = {
      ...leadData,
      stageHistory: [], // Initialize with empty stage history
      currentProcessId: leadProcess.id, // Automatically assign Lead Process
      currentStageId: firstStage.id, // Set to first stage
      status: 'received' as const,
      processes: [initialProcess], // Add the Lead Process to the processes array
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

// Assign process to lead (modified to handle multiple processes)
export const assignProcessToLead = async (leadId: string, processId: string): Promise<void> => {
  try {
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (!leadDoc.exists()) {
      throw new Error("Lead not found");
    }

    const leadData = leadDoc.data() as Lead;
    const existingProcesses = leadData.processes || [];

    // Check if process is already assigned
    if (!existingProcesses.some(p => p.processId === processId)) {
      // Add new process
      const newProcess: LeadProcess = {
        processId,
        assignedAt: Timestamp.now(),
        isActive: true
      };

      // Split the update into two parts to handle timestamps correctly
      const processUpdate = {
        processes: [...existingProcesses, newProcess]
      };

      const stateUpdate = {
        currentProcessId: processId,
        currentStageId: null,
        updatedAt: serverTimestamp()
      };

      // Perform updates separately
      await updateDoc(doc(db, LEADS_COLLECTION, leadId), processUpdate);
      await updateDoc(doc(db, LEADS_COLLECTION, leadId), stateUpdate);
    } else {
      // If process exists, just update it as current
      await updateDoc(doc(db, LEADS_COLLECTION, leadId), {
        currentProcessId: processId,
        currentStageId: null,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error assigning process to lead:", error);
    throw error;
  }
};

// Get lead processes
export const getLeadProcesses = async (leadId: string): Promise<LeadProcess[]> => {
  try {
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (!leadDoc.exists()) {
      throw new Error("Lead not found");
    }

    const leadData = leadDoc.data() as Lead;
    return leadData.processes || [];
  } catch (error) {
    console.error("Error getting lead processes:", error);
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

    // Get stage details to check if it's the "Lead Converted" stage
    const stage = await leadProcessService.getStageById(stageId);
    
    // Prepare the update object
    const updateData: any = {
      currentStageId: stageId,
      currentProcessId: processId,
      stageHistory: [...stageHistory, historyEntry],
      updatedAt: serverTimestamp()
    };

    // Update lead status based on stage name
    if (stage?.name === "Lead Converted") {
      updateData.status = 'converted';
    } else if (stage?.name === "Lead Dropped") {
      updateData.status = 'dropped';
    } else if (stage?.name === "Lead Follow Up") {
      updateData.status = 'followup';
    } else if (stage?.name === "Lead Received") {
      updateData.status = 'received';
    }
    
    // Update the lead with new stage and add to history
    await updateDoc(doc(db, LEADS_COLLECTION, leadId), updateData);
    
    console.log(`Successfully updated lead ${leadId} stage to ${stageId}`);
    
    // Double-check the update was successful
    const updatedLeadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (updatedLeadDoc.exists()) {
      const updatedData = updatedLeadDoc.data();
      console.log(`Verification - lead now has: processId=${updatedData.currentProcessId}, stageId=${updatedData.currentStageId}, status=${updatedData.status}`);
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

// Get all processes
export const getAllProcesses = async (): Promise<Process[]> => {
  try {
    const q = query(collection(db, PROCESSES_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Process[];
  } catch (error) {
    console.error("Error getting processes:", error);
    throw error;
  }
};

// Migrate lead to include Lead Process in processes array if missing
export const migrateLeadProcesses = async (leadId: string): Promise<void> => {
  try {
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (!leadDoc.exists()) {
      throw new Error("Lead not found");
    }

    const leadData = leadDoc.data() as Lead;
    const existingProcesses = leadData.processes || [];

    // Get Lead Process
    const processes = await leadProcessService.getAllProcesses();
    const leadProcess = processes.find(p => p.name === "Lead Process");
    
    if (!leadProcess) {
      throw new Error("Lead Process not found");
    }

    // Check if Lead Process is missing from processes array
    if (!existingProcesses.some(p => p.processId === leadProcess.id)) {
      // Add Lead Process to processes array
      const initialProcess: LeadProcess = {
        processId: leadProcess.id,
        assignedAt: Timestamp.now(),
        isActive: true
      };

      await updateDoc(doc(db, LEADS_COLLECTION, leadId), {
        processes: [...existingProcesses, initialProcess],
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error migrating lead processes:", error);
    throw error;
  }
};

// Unassign process from lead
export const unassignProcessFromLead = async (leadId: string, processId: string): Promise<void> => {
  try {
    const leadDoc = await getDoc(doc(db, LEADS_COLLECTION, leadId));
    if (!leadDoc.exists()) {
      throw new Error("Lead not found");
    }

    const leadData = leadDoc.data() as Lead;
    const existingProcesses = leadData.processes || [];

    // Filter out the process to unassign
    const updatedProcesses = existingProcesses.filter(p => p.processId !== processId);

    // Prepare updates
    const updates: any = {
      processes: updatedProcesses,
      updatedAt: serverTimestamp()
    };

    // If this was the current process, reset currentProcessId and currentStageId
    if (leadData.currentProcessId === processId) {
      updates.currentProcessId = null;
      updates.currentStageId = null;
    }

    // Update the lead
    await updateDoc(doc(db, LEADS_COLLECTION, leadId), updates);
  } catch (error) {
    console.error("Error unassigning process from lead:", error);
    throw error;
  }
}; 