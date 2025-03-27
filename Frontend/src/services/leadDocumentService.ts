import { db } from "@/firebase/config";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  DocumentData,
  getFirestore,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from "@/firebase/config";

// For now we'll use a mock Firebase implementation
// In production, you should use the actual Firebase SDK
const firestore = {
  collection: (path: string) => ({ path }),
  query: (...args: any[]) => args,
  where: (field: string, op: string, value: any) => ({ field, op, value }),
  getDocs: async () => ({
    empty: true,
    forEach: () => {}
  }),
  doc: (path: string, id: string) => ({ path, id }),
  getDoc: async () => ({
    exists: () => false,
    data: () => ({})
  })
};

// Document interface matching what we use in the components
export interface Document {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: "pending" | "approved" | "rejected" | "not_submitted";
  uploadedAt?: Date | null;
  fileUrl?: string;
  fileType?: string;
  notes?: string;
  requirementId?: string;
}

// Document requirement interface from Firestore
interface DocumentRequirement extends DocumentData {
  name: string;
  description?: string;
  required?: boolean;
  fileTypes?: string[];
  processId: string;
  stageId?: string;
  show?: boolean;
  noDocumentsRequired?: boolean;
}

// Lead document interface from Firestore
interface LeadDocument extends DocumentData {
  name: string;
  description?: string;
  required?: boolean;
  status?: "pending" | "approved" | "rejected" | "not_submitted";
  uploadedAt?: any; // Firebase Timestamp
  fileUrl?: string;
  fileType?: string;
  notes?: string;
  leadId: string;
  requirementId?: string;
}

// Get document requirements for a specific process and stage
export const getRequiredDocuments = async (
  processId: string,
  stageId?: string
): Promise<Document[]> => {
  try {
    console.log(`Fetching document requirements for process: ${processId}, stage: ${stageId || 'none'}`);
    
    // Try to fetch document requirements from the database based on process and stage
    const docRequirementsRef = collection(db, "documentRequirements");
    let requirementsQuery;
    
    if (stageId) {
      // If stage ID is provided, look for requirements specific to this process and stage
      requirementsQuery = query(
        docRequirementsRef,
        where("processId", "==", processId),
        where("stageId", "==", stageId)
      );
      
      console.log(`Querying for process-specific + stage-specific requirements: processId=${processId}, stageId=${stageId}`);
    } else {
      // If no stage ID, look for process-level requirements
      requirementsQuery = query(
        docRequirementsRef,
        where("processId", "==", processId),
        where("stageId", "==", null)
      );
      
      console.log(`Querying for process-level requirements (no stage): processId=${processId}`);
    }
    
    const requirementsSnapshot = await getDocs(requirementsQuery);
    
    console.log(`Query returned ${requirementsSnapshot.size} document requirements`);
    
    // If we found specific requirements, use them - even if the array is empty
    // This is crucial because an empty array means "no documents required"
    const requirements: Document[] = [];
    
    if (!requirementsSnapshot.empty) {
      requirementsSnapshot.forEach(doc => {
        const data = doc.data() as DocumentRequirement;
        // Skip if explicitly marked as "show: false"
        if (data.show === false) {
          console.log(`Skipping requirement (show=false): ${doc.id} - ${data.name}`);
          return;
        }
        
        requirements.push({
          id: doc.id,
          name: data.name,
          description: data.description || "",
          required: data.required !== undefined ? data.required : true,
          status: "not_submitted"
        });
        
        console.log(`Found requirement: ${doc.id} - ${data.name}`);
      });
      
      console.log(`Found ${requirements.length} document requirements in database`);
      
      // Return the requirements (could be empty array if all had show=false)
      return requirements;
    }
    
    // If we have explicit stage requirements but none were found, try falling back to process-level
    if (stageId) {
      console.log(`No stage-specific requirements found, trying process-level requirements`);
      
      const processLevelQuery = query(
        docRequirementsRef,
        where("processId", "==", processId),
        where("stageId", "==", null)
      );
      
      const processLevelSnapshot = await getDocs(processLevelQuery);
      
      // Check for an explicit "no documents" marker
      const noDocsQuery = query(
        docRequirementsRef,
        where("processId", "==", processId),
        where("stageId", "==", stageId),
        where("noDocumentsRequired", "==", true)
      );
      
      const noDocsSnapshot = await getDocs(noDocsQuery);
      
      // If we have an explicit "no documents required" entry, return empty array
      if (!noDocsSnapshot.empty) {
        console.log(`Found explicit "no documents required" marker for this stage`);
        return [];
      }
      
      if (!processLevelSnapshot.empty) {
        processLevelSnapshot.forEach(doc => {
          const data = doc.data() as DocumentRequirement;
          
          // Skip if explicitly marked as "show: false"
          if (data.show === false) {
            console.log(`Skipping process-level requirement (show=false): ${doc.id} - ${data.name}`);
            return;
          }
          
          requirements.push({
            id: doc.id,
            name: data.name,
            description: data.description || "",
            required: data.required !== undefined ? data.required : true,
            status: "not_submitted"
          });
          
          console.log(`Found process-level requirement: ${doc.id} - ${data.name}`);
        });
        
        console.log(`Found ${requirements.length} process-level document requirements`);
        return requirements;
      }
    }
    
    // Check if we have an explicit entry indicating no documents required for this process/stage
    let noDocsQuery = query(
      docRequirementsRef,
      where("processId", "==", processId),
      where("noDocumentsRequired", "==", true)
    );
    
    if (stageId) {
      // Add stage filter if available
      noDocsQuery = query(
        docRequirementsRef,
        where("processId", "==", processId),
        where("stageId", "==", stageId),
        where("noDocumentsRequired", "==", true)
      );
    }
    
    const noDocsSnapshot = await getDocs(noDocsQuery);
    
    // If we have an explicit "no documents required" entry, return empty array
    if (!noDocsSnapshot.empty) {
      console.log(`Found explicit "no documents required" marker`);
      return [];
    }
    
    // If no specific requirements found in database, ONLY return defaults if not in a real process
    // For real process IDs that don't have requirements, assume no documents needed
    if (processId && processId !== 'default' && processId !== 'nursing-registration' &&
        processId !== 'insurance-application' && processId !== 'mortgage-application' && 
        processId !== 'employment-application') {
      console.log(`No requirements found for real process ID ${processId}, assuming no documents needed`);
      return [];
    }
    
    console.log("Using default document requirements based on process type");
    
    // Default document requirements - only used for demo processes or default
    const basicRequirements: Document[] = [
      {
        id: "doc-1",
        name: "Identification Document",
        description: "Government issued photo ID (passport, driving license)",
        required: true,
        status: "not_submitted"
      },
      {
        id: "doc-2",
        name: "Proof of Address",
        description: "Utility bill or bank statement issued within the last 3 months",
        required: true,
        status: "not_submitted"
      },
    ];
    
    // Nursing Registration documents
    if (processId === "nursing-registration") {
      return [
        ...basicRequirements,
        {
          id: "doc-3",
          name: "Education Certificate",
          description: "Nursing degree or qualification certificate",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-4",
          name: "Passport Copy",
          description: "Full copy of current passport",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-5",
          name: "English Language Test Results",
          description: "IELTS or OET test results (must be less than 2 years old)",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-6",
          name: "Mark Sheet",
          description: "Academic transcripts showing grades and courses completed",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-7",
          name: "Passport Photos",
          description: "Recent passport-sized photographs (less than 6 months old)",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-8",
          name: "Transcripts",
          description: "Official academic transcripts from your nursing program",
          required: true,
          status: "not_submitted"
        }
      ];
    }
    
    // Insurance application documents
    if (processId === "insurance-application") {
      return [
        ...basicRequirements,
        {
          id: "doc-3",
          name: "Insurance Application Form",
          description: "Completed insurance application form with signature",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-4",
          name: "Medical Report",
          description: "Recent medical report if applying for health insurance",
          required: false,
          status: "not_submitted"
        }
      ];
    }
    
    // Mortgage application documents
    if (processId === "mortgage-application") {
      return [
        ...basicRequirements,
        {
          id: "doc-3",
          name: "Mortgage Application Form",
          description: "Completed mortgage application with signature",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-4",
          name: "Proof of Income",
          description: "Last 3 months of pay slips or bank statements",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-5",
          name: "Property Details",
          description: "Information about the property you want to purchase",
          required: true,
          status: "not_submitted"
        }
      ];
    }
    
    // Employment application documents
    if (processId === "employment-application") {
      return [
        ...basicRequirements,
        {
          id: "doc-3",
          name: "Resume/CV",
          description: "Current resume or curriculum vitae",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-4",
          name: "Education Certificates",
          description: "Copies of your educational qualifications",
          required: true,
          status: "not_submitted"
        },
        {
          id: "doc-5",
          name: "Reference Letters",
          description: "Professional reference letters from previous employers",
          required: false,
          status: "not_submitted"
        }
      ];
    }
    
    // If no specific process or an unknown process, return basic requirements
    return basicRequirements;
  } catch (error) {
    console.error("Error fetching document requirements:", error);
    console.error("Process ID:", processId);
    console.error("Stage ID:", stageId);
    throw error;
  }
};

// Get a lead's submitted documents
export const getLeadDocuments = async (leadId: string): Promise<Document[]> => {
  try {
    console.log(`Fetching submitted documents for lead: ${leadId}`);
    
    // Query Firestore for submitted documents
    const leadDocsRef = collection(db, "leadDocuments");
    const leadDocsQuery = query(leadDocsRef, where("leadId", "==", leadId));
    const leadDocsSnapshot = await getDocs(leadDocsQuery);
    
    // If no documents found, return empty array
    if (leadDocsSnapshot.empty) {
      console.log("No submitted documents found for this lead");
      return [];
    }
    
    // Map documents from Firestore to our Document interface
    const documents: Document[] = [];
    
    leadDocsSnapshot.forEach(doc => {
      const data = doc.data() as LeadDocument;
      documents.push({
        id: doc.id,
        name: data.name || "",
        description: data.description || "",
        required: data.required !== undefined ? data.required : true,
        status: data.status || "pending",
        uploadedAt: data.uploadedAt ? data.uploadedAt.toDate() : null,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        notes: data.notes,
        requirementId: data.requirementId
      });
    });
    
    console.log(`Found ${documents.length} submitted documents`);
    return documents;
  } catch (error) {
    console.error("Error fetching lead documents:", error);
    return [];
  }
};

// Upload a document for a lead
export const uploadLeadDocument = async (
  leadId: string,
  requirementId: string,
  file: File
): Promise<void> => {
  try {
    // Upload file to Firebase Storage
    const storageRefPath = `leads/${leadId}/documents/${Date.now()}_${file.name}`;
    const storageRefObj = ref(storage, storageRefPath);
    
    const uploadTask = uploadBytesResumable(storageRefObj, file);
    
    return new Promise<void>((resolve, reject) => {
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
          try {
            // Handle success
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save document metadata to Firestore
            const docData = {
              leadId,
              requirementId, // This is the document requirement ID
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              fileUrl: downloadUrl,
              storageRef: storageRefPath,
              status: "pending",
              uploadedAt: serverTimestamp()
            };
            
            await addDoc(collection(db, "leadDocuments"), docData);
            console.log("Document metadata saved successfully");
            resolve();
          } catch (error) {
            console.error("Error saving document metadata:", error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

// Get document submission status
export const getDocumentStatus = async (
  leadId: string,
  documentId: string
): Promise<string> => {
  try {
    // In a real application, this would fetch from Firestore
    // For demonstration, return not_submitted
    return "not_submitted";
  } catch (error) {
    console.error("Error fetching document status:", error);
    throw error;
  }
}; 