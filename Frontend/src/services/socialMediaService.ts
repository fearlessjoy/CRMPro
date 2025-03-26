import { db } from '@/config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

// Types
export interface SocialMediaIntegration {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  pageId: string;
  pageName: string;
  pageImage?: string;
  accessToken: string;
  tokenExpiresAt: Date;
  status: 'active' | 'paused' | 'error';
  connectedBy: string;
  connectedAt: Date;
  lastUpdated: Date;
  leadFormIds?: string[];
}

export interface SocialMediaLeadForm {
  id: string;
  integrationId: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  formId: string;
  formName: string;
  pageId: string;
  pageName: string;
  status: 'active' | 'paused';
  createdAt: Date;
  lastUpdated: Date;
  leadsReceived: number;
  fieldMapping?: Record<string, string>;
}

export interface SocialMediaLead {
  id: string;
  leadFormId: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  formName: string;
  pageId: string;
  pageName: string;
  leadData: Record<string, any>;
  mappedData: Record<string, any>;
  createdAt: Date;
  processed: boolean;
}

// Collection references
const integrationsCollection = collection(db, 'socialMediaIntegrations');
const leadFormsCollection = collection(db, 'socialMediaLeadForms');
const leadsCollection = collection(db, 'socialMediaLeads');

// Helper function to convert Firestore timestamp to Date
const convertTimestamps = (data: any) => {
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate();
    }
  }
  return result;
};

// Integration functions
export const getSocialMediaIntegrations = async (): Promise<SocialMediaIntegration[]> => {
  try {
    const snapshot = await getDocs(integrationsCollection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as SocialMediaIntegration));
  } catch (error) {
    console.error('Error getting social media integrations:', error);
    throw error;
  }
};

export const getSocialMediaIntegrationById = async (id: string): Promise<SocialMediaIntegration | null> => {
  try {
    const docRef = doc(integrationsCollection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data())
    } as SocialMediaIntegration;
  } catch (error) {
    console.error('Error getting social media integration:', error);
    throw error;
  }
};

export const addSocialMediaIntegration = async (integration: Omit<SocialMediaIntegration, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(integrationsCollection, {
      ...integration,
      lastUpdated: serverTimestamp(),
      leadFormIds: integration.leadFormIds || []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding social media integration:', error);
    throw error;
  }
};

export const updateSocialMediaIntegration = async (id: string, data: Partial<SocialMediaIntegration>): Promise<void> => {
  try {
    const docRef = doc(integrationsCollection, id);
    await updateDoc(docRef, {
      ...data,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating social media integration:', error);
    throw error;
  }
};

export const deleteSocialMediaIntegration = async (id: string): Promise<void> => {
  try {
    // Delete associated lead forms first
    const leadForms = await getSocialMediaLeadForms(id);
    for (const form of leadForms) {
      await deleteSocialMediaLeadForm(form.id);
    }
    
    // Delete the integration
    const docRef = doc(integrationsCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting social media integration:', error);
    throw error;
  }
};

// Lead Form functions
export const getSocialMediaLeadForms = async (integrationId: string): Promise<SocialMediaLeadForm[]> => {
  try {
    const q = query(leadFormsCollection, where('integrationId', '==', integrationId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as SocialMediaLeadForm));
  } catch (error) {
    console.error('Error getting lead forms:', error);
    throw error;
  }
};

export const addSocialMediaLeadForm = async (leadForm: Omit<SocialMediaLeadForm, 'id'>): Promise<string> => {
  try {
    // Add the lead form
    const docRef = await addDoc(leadFormsCollection, {
      ...leadForm,
      lastUpdated: serverTimestamp(),
      leadsReceived: 0
    });
    
    // Update the integration's leadFormIds array
    const integrationSnap = await getDoc(doc(integrationsCollection, leadForm.integrationId));
    if (integrationSnap.exists()) {
      const integration = integrationSnap.data() as SocialMediaIntegration;
      const currentFormIds = integration.leadFormIds || [];
      await updateDoc(doc(integrationsCollection, leadForm.integrationId), {
        leadFormIds: [...currentFormIds, docRef.id]
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding lead form:', error);
    throw error;
  }
};

export const updateSocialMediaLeadForm = async (id: string, data: Partial<SocialMediaLeadForm>): Promise<void> => {
  try {
    const docRef = doc(leadFormsCollection, id);
    await updateDoc(docRef, {
      ...data,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating lead form:', error);
    throw error;
  }
};

export const deleteSocialMediaLeadForm = async (id: string): Promise<void> => {
  try {
    // Get the lead form to get its integrationId
    const formSnap = await getDoc(doc(leadFormsCollection, id));
    if (formSnap.exists()) {
      const form = formSnap.data() as SocialMediaLeadForm;
      
      // Update the integration's leadFormIds array
      const integrationSnap = await getDoc(doc(integrationsCollection, form.integrationId));
      if (integrationSnap.exists()) {
        const integration = integrationSnap.data() as SocialMediaIntegration;
        const updatedFormIds = (integration.leadFormIds || []).filter(formId => formId !== id);
        await updateDoc(doc(integrationsCollection, form.integrationId), {
          leadFormIds: updatedFormIds
        });
      }
      
      // Delete associated leads
      const leadsQuery = query(leadsCollection, where('leadFormId', '==', id));
      const leadsSnapshot = await getDocs(leadsQuery);
      for (const leadDoc of leadsSnapshot.docs) {
        await deleteDoc(leadDoc.ref);
      }
    }
    
    // Delete the lead form
    await deleteDoc(doc(leadFormsCollection, id));
  } catch (error) {
    console.error('Error deleting lead form:', error);
    throw error;
  }
};

// Lead functions
export const addSocialMediaLead = async (lead: Omit<SocialMediaLead, 'id'>): Promise<string> => {
  try {
    // Add the lead
    const docRef = await addDoc(leadsCollection, {
      ...lead,
      processed: false,
      createdAt: serverTimestamp()
    });
    
    // Update the lead form's leadsReceived count
    const formRef = doc(leadFormsCollection, lead.leadFormId);
    const formSnap = await getDoc(formRef);
    if (formSnap.exists()) {
      const form = formSnap.data() as SocialMediaLeadForm;
      await updateDoc(formRef, {
        leadsReceived: (form.leadsReceived || 0) + 1,
        lastUpdated: serverTimestamp()
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding lead:', error);
    throw error;
  }
};

export const getUnprocessedLeads = async (): Promise<SocialMediaLead[]> => {
  try {
    const q = query(leadsCollection, where('processed', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as SocialMediaLead));
  } catch (error) {
    console.error('Error getting unprocessed leads:', error);
    throw error;
  }
};

export const markLeadAsProcessed = async (id: string): Promise<void> => {
  try {
    const docRef = doc(leadsCollection, id);
    await updateDoc(docRef, {
      processed: true
    });
  } catch (error) {
    console.error('Error marking lead as processed:', error);
    throw error;
  }
}; 