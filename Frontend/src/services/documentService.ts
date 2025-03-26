import { db, storage } from "@/firebase/config";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";

// Document requirement definition
export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  stageId: string;  // The stage this document is required for
  processId: string; // The process this document is required for
  fileTypes: string[]; // Allowed file types (e.g., ["pdf", "jpg", "png"])
  maxSizeInMB: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Document uploaded by lead
export interface LeadDocument {
  id: string;
  leadId: string;
  requirementId: string;  // Reference to the requirement
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;  // User ID who uploaded
  downloadUrl: string;
  storageRef: string;  // Firebase storage reference path
  notes?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}

// Form definition for collecting structured data
export interface FormRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  stageId: string;
  processId: string;
  fields: FormField[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Form field definition
export interface FormField {
  id: string;
  type: "text" | "number" | "email" | "phone" | "date" | "select" | "checkbox" | "textarea";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];  // For select fields
  validation?: string; // Regex pattern for validation
}

// Submitted form data
export interface LeadForm {
  id: string;
  leadId: string;
  requirementId: string; // Reference to the form requirement
  data: Record<string, any>;  // Form field values
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}

// Document Requirements CRUD Operations
const docRequirementsCollection = "documentRequirements";

export const createDocumentRequirement = async (requirement: Omit<DocumentRequirement, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, docRequirementsCollection), {
      ...requirement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...requirement,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
  } catch (error) {
    console.error("Error creating document requirement:", error);
    throw error;
  }
};

export const getDocumentRequirementsByStage = async (stageId: string) => {
  try {
    const q = query(
      collection(db, docRequirementsCollection),
      where("stageId", "==", stageId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DocumentRequirement[];
  } catch (error) {
    console.error("Error getting document requirements:", error);
    throw error;
  }
};

export const getDocumentRequirementsByProcessAndStage = async (processId: string, stageId: string) => {
  try {
    const q = query(
      collection(db, docRequirementsCollection),
      where("processId", "==", processId),
      where("stageId", "==", stageId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DocumentRequirement[];
  } catch (error) {
    console.error("Error getting document requirements:", error);
    throw error;
  }
};

export const updateDocumentRequirement = async (id: string, updates: Partial<DocumentRequirement>) => {
  try {
    const docRef = doc(db, docRequirementsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating document requirement:", error);
    throw error;
  }
};

export const deleteDocumentRequirement = async (id: string) => {
  try {
    await deleteDoc(doc(db, docRequirementsCollection, id));
    return true;
  } catch (error) {
    console.error("Error deleting document requirement:", error);
    throw error;
  }
};

// Form Requirements CRUD Operations
const formRequirementsCollection = "formRequirements";

export const createFormRequirement = async (requirement: Omit<FormRequirement, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, formRequirementsCollection), {
      ...requirement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...requirement,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
  } catch (error) {
    console.error("Error creating form requirement:", error);
    throw error;
  }
};

export const getFormRequirementsByStage = async (stageId: string) => {
  try {
    const q = query(
      collection(db, formRequirementsCollection),
      where("stageId", "==", stageId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FormRequirement[];
  } catch (error) {
    console.error("Error getting form requirements:", error);
    throw error;
  }
};

export const updateFormRequirement = async (id: string, updates: Partial<FormRequirement>) => {
  try {
    const docRef = doc(db, formRequirementsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating form requirement:", error);
    throw error;
  }
};

export const deleteFormRequirement = async (id: string) => {
  try {
    await deleteDoc(doc(db, formRequirementsCollection, id));
    return true;
  } catch (error) {
    console.error("Error deleting form requirement:", error);
    throw error;
  }
};

// Lead Documents CRUD Operations
const leadDocumentsCollection = "leadDocuments";

export const uploadLeadDocument = async (
  leadId: string,
  requirementId: string,
  file: File,
  uploadedBy: string,
  notes?: string
) => {
  try {
    // Upload file to Firebase Storage
    const storageRefPath = `leads/${leadId}/documents/${Date.now()}_${file.name}`;
    const storageRefObj = ref(storage, storageRefPath);
    
    const uploadTask = uploadBytesResumable(storageRefObj, file);
    
    return new Promise<LeadDocument>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Handle progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          // Handle error
          console.error("Error uploading file:", error);
          reject(error);
        },
        async () => {
          // Handle success
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save document metadata to Firestore
          const docData: Omit<LeadDocument, "id"> = {
            leadId,
            requirementId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedBy,
            downloadUrl,
            storageRef: storageRefPath,
            notes: notes || "",
            status: "pending",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          
          const docRef = await addDoc(collection(db, leadDocumentsCollection), docData);
          
          resolve({
            id: docRef.id,
            ...docData
          });
        }
      );
    });
  } catch (error) {
    console.error("Error uploading lead document:", error);
    throw error;
  }
};

export const getLeadDocuments = async (leadId: string) => {
  try {
    const q = query(
      collection(db, leadDocumentsCollection),
      where("leadId", "==", leadId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeadDocument[];
  } catch (error) {
    console.error("Error getting lead documents:", error);
    throw error;
  }
};

export const getLeadDocumentsByRequirement = async (leadId: string, requirementId: string) => {
  try {
    const q = query(
      collection(db, leadDocumentsCollection),
      where("leadId", "==", leadId),
      where("requirementId", "==", requirementId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeadDocument[];
  } catch (error) {
    console.error("Error getting lead documents by requirement:", error);
    throw error;
  }
};

export const updateLeadDocumentStatus = async (
  documentId: string, 
  status: "pending" | "approved" | "rejected",
  reviewedBy: string,
  rejectionReason?: string
) => {
  try {
    const docRef = doc(db, leadDocumentsCollection, documentId);
    await updateDoc(docRef, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating lead document status:", error);
    throw error;
  }
};

export const deleteLeadDocument = async (documentId: string) => {
  try {
    // Get document reference from Firestore
    const docRef = doc(db, leadDocumentsCollection, documentId);
    const documentSnapshot = await getDoc(docRef);
    
    if (!documentSnapshot.exists()) {
      throw new Error("Document not found");
    }
    
    const documentData = documentSnapshot.data() as LeadDocument;
    
    // Delete file from storage
    const storageRefObj = ref(storage, documentData.storageRef);
    await deleteObject(storageRefObj);
    
    // Delete metadata from Firestore
    await deleteDoc(docRef);
    
    return true;
  } catch (error) {
    console.error("Error deleting lead document:", error);
    throw error;
  }
};

// Lead Forms CRUD Operations
const leadFormsCollection = "leadForms";

export const createLeadForm = async (
  leadId: string,
  requirementId: string,
  data: Record<string, any>,
  status: LeadForm["status"] = "draft"
) => {
  try {
    const formData: Omit<LeadForm, "id"> = {
      leadId,
      requirementId,
      data,
      status,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, leadFormsCollection), formData);
    
    return {
      id: docRef.id,
      ...formData
    };
  } catch (error) {
    console.error("Error creating lead form:", error);
    throw error;
  }
};

export const getLeadForms = async (leadId: string) => {
  try {
    const q = query(
      collection(db, leadFormsCollection),
      where("leadId", "==", leadId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeadForm[];
  } catch (error) {
    console.error("Error getting lead forms:", error);
    throw error;
  }
};

export const getLeadFormByRequirement = async (leadId: string, requirementId: string) => {
  try {
    const q = query(
      collection(db, leadFormsCollection),
      where("leadId", "==", leadId),
      where("requirementId", "==", requirementId)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first form found (there should only be one)
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as LeadForm;
  } catch (error) {
    console.error("Error getting lead form:", error);
    throw error;
  }
};

export const updateLeadForm = async (
  formId: string,
  updates: Partial<Omit<LeadForm, "id" | "createdAt" | "updatedAt" | "leadId" | "requirementId">>
) => {
  try {
    const docRef = doc(db, leadFormsCollection, formId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating lead form:", error);
    throw error;
  }
};

export const submitLeadForm = async (formId: string) => {
  try {
    const docRef = doc(db, leadFormsCollection, formId);
    await updateDoc(docRef, {
      status: "submitted",
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error submitting lead form:", error);
    throw error;
  }
};

export const reviewLeadForm = async (
  formId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
  rejectionReason?: string
) => {
  try {
    const docRef = doc(db, leadFormsCollection, formId);
    await updateDoc(docRef, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error reviewing lead form:", error);
    throw error;
  }
};

export const deleteLeadForm = async (formId: string) => {
  try {
    await deleteDoc(doc(db, leadFormsCollection, formId));
    return true;
  } catch (error) {
    console.error("Error deleting lead form:", error);
    throw error;
  }
}; 