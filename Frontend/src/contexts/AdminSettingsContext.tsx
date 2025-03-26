import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type AdminSettings, getAdminSettings } from '@/services/adminSettingsService';

interface AdminSettingsContextType {
  settings: AdminSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAdminSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading admin settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <AdminSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
      }}
    >
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const context = useContext(AdminSettingsContext);
  if (context === undefined) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
} 