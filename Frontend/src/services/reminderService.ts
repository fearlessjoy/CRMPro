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
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Reminder {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  dueDate: Timestamp;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  notifyBefore?: number; // minutes before due date
}

const REMINDERS_COLLECTION = "reminders";

// Create a new reminder
export const createReminder = async (
  reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<Reminder> => {
  try {
    const newReminderRef = doc(collection(db, REMINDERS_COLLECTION));
    
    const now = Timestamp.now();
    const reminder = {
      ...reminderData,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    
    await setDoc(newReminderRef, reminder);
    
    return {
      id: newReminderRef.id,
      ...reminder
    } as Reminder;
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }
};

// Get all reminders for a lead
export const getRemindersByLead = async (leadId: string): Promise<Reminder[]> => {
  try {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where("leadId", "==", leadId),
      orderBy("dueDate", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reminder[];
  } catch (error) {
    console.error("Error getting reminders:", error);
    throw error;
  }
};

// Get reminders assigned to a user
export const getRemindersByUser = async (userId: string): Promise<Reminder[]> => {
  try {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where("assignedTo", "==", userId),
      where("status", "in", ["pending", "overdue"]),
      orderBy("dueDate", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reminder[];
  } catch (error) {
    console.error("Error getting user reminders:", error);
    throw error;
  }
};

// Update reminder status
export const updateReminderStatus = async (
  reminderId: string,
  status: Reminder['status'],
  completedBy?: string
): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updatedAt: Timestamp.now()
    };

    if (status === 'completed' && completedBy) {
      updateData.completedAt = Timestamp.now();
      updateData.completedBy = completedBy;
    }

    await updateDoc(doc(db, REMINDERS_COLLECTION, reminderId), updateData);
  } catch (error) {
    console.error("Error updating reminder status:", error);
    throw error;
  }
};

// Delete a reminder
export const deleteReminder = async (reminderId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, REMINDERS_COLLECTION, reminderId));
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw error;
  }
};

// Update reminder details
export const updateReminder = async (
  reminderId: string,
  reminderData: Partial<Reminder>
): Promise<void> => {
  try {
    await updateDoc(doc(db, REMINDERS_COLLECTION, reminderId), {
      ...reminderData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw error;
  }
}; 