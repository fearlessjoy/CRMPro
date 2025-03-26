import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/firebase/config";

// Types
export interface Stage {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  order: number;
  processId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Collection names
const PROCESSES_COLLECTION = "leadProcesses";
const STAGES_COLLECTION = "leadStages";

// Get all processes
export const getAllProcesses = async (): Promise<Process[]> => {
  try {
    const q = query(collection(db, PROCESSES_COLLECTION), orderBy("order"));
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
export const createProcess = async (processData: Omit<Process, "id">): Promise<Process> => {
  try {
    const newProcessRef = doc(collection(db, PROCESSES_COLLECTION));
    await setDoc(newProcessRef, {
      ...processData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const newProcess = await getDoc(newProcessRef);
    
    return { id: newProcess.id, ...newProcess.data() } as Process;
  } catch (error) {
    console.error("Error creating process:", error);
    throw error;
  }
};

// Update a process
export const updateProcess = async (processId: string, processData: Partial<Process>): Promise<void> => {
  try {
    await updateDoc(doc(db, PROCESSES_COLLECTION, processId), {
      ...processData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating process:", error);
    throw error;
  }
};

// Delete a process
export const deleteProcess = async (processId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete the process
    batch.delete(doc(db, PROCESSES_COLLECTION, processId));
    
    // Delete all related stages
    const stages = await getStagesByProcess(processId);
    stages.forEach(stage => {
      batch.delete(doc(db, STAGES_COLLECTION, stage.id));
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error deleting process:", error);
    throw error;
  }
};

// Get all stages for a process
export const getStagesByProcess = async (processId: string): Promise<Stage[]> => {
  try {
    const q = query(
      collection(db, STAGES_COLLECTION), 
      orderBy("order")
    );
    
    const querySnapshot = await getDocs(q);
    const allStages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Stage[];
    
    // Filter stages for the given process
    const processStages = allStages.filter(stage => 
      stage.processId === processId
    );
    
    return processStages;
  } catch (error) {
    console.error("Error getting stages:", error);
    throw error;
  }
};

// Get stage by ID
export const getStageById = async (stageId: string): Promise<Stage | null> => {
  try {
    const stageDoc = await getDoc(doc(db, STAGES_COLLECTION, stageId));
    
    if (stageDoc.exists()) {
      return { id: stageDoc.id, ...stageDoc.data() } as Stage;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting stage:", error);
    throw error;
  }
};

// Create a new stage
export const createStage = async (processId: string, stageData: Omit<Stage, "id" | "processId">): Promise<Stage> => {
  try {
    const newStageRef = doc(collection(db, STAGES_COLLECTION));
    await setDoc(newStageRef, {
      ...stageData,
      processId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const newStage = await getDoc(newStageRef);
    
    return { id: newStage.id, ...newStage.data() } as Stage;
  } catch (error) {
    console.error("Error creating stage:", error);
    throw error;
  }
};

// Update a stage
export const updateStage = async (stageId: string, stageData: Partial<Stage>): Promise<void> => {
  try {
    await updateDoc(doc(db, STAGES_COLLECTION, stageId), {
      ...stageData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating stage:", error);
    throw error;
  }
};

// Delete a stage
export const deleteStage = async (stageId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, STAGES_COLLECTION, stageId));
  } catch (error) {
    console.error("Error deleting stage:", error);
    throw error;
  }
};

// Reorder stages
export const reorderStages = async (processId: string, stageIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    stageIds.forEach((stageId, index) => {
      batch.update(doc(db, STAGES_COLLECTION, stageId), { 
        order: index + 1,
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error reordering stages:", error);
    throw error;
  }
};

// Reorder processes
export const reorderProcesses = async (processIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    processIds.forEach((processId, index) => {
      batch.update(doc(db, PROCESSES_COLLECTION, processId), { 
        order: index + 1,
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error reordering processes:", error);
    throw error;
  }
}; 