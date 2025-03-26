import { db, storage } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface AdminSettings {
  companyName: string;
  companyLogo?: string;
  primaryColor?: string;
  favicon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SETTINGS_DOC_ID = 'general';
const SETTINGS_COLLECTION = 'adminSettings';

export const getAdminSettings = async (): Promise<AdminSettings | null> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      return null;
    }

    const data = settingsDoc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as AdminSettings;
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    throw new Error('Failed to fetch admin settings. Please check your permissions and try again.');
  }
};

export const updateAdminSettings = async (
  settings: Partial<AdminSettings>,
  logoFile?: File
): Promise<AdminSettings> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const currentSettings = await getDoc(settingsRef);
    
    let logoUrl = settings.companyLogo;

    // Handle logo upload if provided
    if (logoFile) {
      try {
        const logoRef = ref(storage, `settings/logo_${Date.now()}`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);

        // Delete old logo if exists
        if (currentSettings.exists() && currentSettings.data()?.companyLogo) {
          try {
            const oldLogoRef = ref(storage, currentSettings.data().companyLogo);
            await deleteObject(oldLogoRef);
          } catch (error) {
            console.warn('Error deleting old logo:', error);
            // Continue even if old logo deletion fails
          }
        }
      } catch (error: any) {
        if (error.code === 'storage/unauthorized') {
          throw new Error('You do not have permission to upload files. Please contact your administrator.');
        }
        throw new Error('Failed to upload logo. Please try again.');
      }
    }

    const updatedSettings = {
      companyName: currentSettings.exists() 
        ? (currentSettings.data() as AdminSettings).companyName 
        : 'My Company', // Default value
      ...(currentSettings.exists() ? currentSettings.data() as AdminSettings : {}),
      ...settings,
      companyLogo: logoUrl || settings.companyLogo,
      updatedAt: new Date(),
      createdAt: currentSettings.exists() 
        ? currentSettings.data().createdAt 
        : new Date()
    } as AdminSettings;

    await setDoc(settingsRef, updatedSettings);
    return updatedSettings;
  } catch (error) {
    console.error('Error updating admin settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update settings. Please try again.');
  }
}; 