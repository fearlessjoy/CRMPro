import { db } from "@/firebase/config";
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

// Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Collection reference
const TEMPLATES_COLLECTION = "emailTemplates";

// Get all email templates
export const getAllTemplates = async (): Promise<EmailTemplate[]> => {
  try {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EmailTemplate[];
  } catch (error) {
    console.error("Error getting email templates:", error);
    throw error;
  }
};

// Get template by ID
export const getTemplateById = async (templateId: string): Promise<EmailTemplate | null> => {
  try {
    const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, templateId));
    
    if (templateDoc.exists()) {
      return { id: templateDoc.id, ...templateDoc.data() } as EmailTemplate;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting email template:", error);
    throw error;
  }
};

// Create a new template
export const createTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> => {
  try {
    const newTemplateRef = doc(collection(db, TEMPLATES_COLLECTION));
    
    const newTemplate = {
      ...templateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(newTemplateRef, newTemplate);
    
    // Get the template with the newly created ID
    const createdTemplateDoc = await getDoc(newTemplateRef);
    
    return { id: createdTemplateDoc.id, ...createdTemplateDoc.data() } as EmailTemplate;
  } catch (error) {
    console.error("Error creating email template:", error);
    throw error;
  }
};

// Update template
export const updateTemplate = async (templateId: string, templateData: Partial<EmailTemplate>): Promise<void> => {
  try {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, templateId), {
      ...templateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating email template:", error);
    throw error;
  }
};

// Delete template
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
  } catch (error) {
    console.error("Error deleting email template:", error);
    throw error;
  }
};

// Toggle template active status
export const toggleTemplateStatus = async (templateId: string, isActive: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, templateId), {
      isActive,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error toggling template status:", error);
    throw error;
  }
}; 