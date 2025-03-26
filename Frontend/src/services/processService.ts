import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Stage {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  stages: { [key: string]: Stage };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const PROCESSES_COLLECTION = "processes";

// Get all processes
export const getAllProcesses = async (): Promise<Process[]> => {
  try {
    const q = query(
      collection(db, PROCESSES_COLLECTION),
      orderBy("createdAt", "desc")
    );
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

// Get process by ID
export const getProcessById = async (processId: string): Promise<Process | null> => {
  try {
    const processDoc = await getDoc(doc(db, PROCESSES_COLLECTION, processId));
    
    if (processDoc.exists()) {
      return { id: processDoc.id, ...processDoc.data() } as Process;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting process:", error);
    throw error;
  }
};

// Create a new process
export const createProcess = async (processData: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>): Promise<Process> => {
  try {
    const newProcessRef = doc(collection(db, PROCESSES_COLLECTION));
    
    const newProcess = {
      ...processData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(newProcessRef, newProcess);
    
    return { id: newProcessRef.id, ...newProcess };
  } catch (error) {
    console.error("Error creating process:", error);
    throw error;
  }
};

// Update a process
export const updateProcess = async (processId: string, processData: Partial<Process>): Promise<void> => {
  try {
    const processRef = doc(db, PROCESSES_COLLECTION, processId);
    
    await updateDoc(processRef, {
      ...processData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating process:", error);
    throw error;
  }
};

// Delete a process
export const deleteProcess = async (processId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PROCESSES_COLLECTION, processId));
  } catch (error) {
    console.error("Error deleting process:", error);
    throw error;
  }
}; 