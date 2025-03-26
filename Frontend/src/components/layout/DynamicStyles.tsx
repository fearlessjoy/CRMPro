import { useEffect } from 'react';
import { useAdminSettings } from '@/contexts/AdminSettingsContext';

export function DynamicStyles() {
  const { settings } = useAdminSettings();

  useEffect(() => {
    if (settings?.primaryColor) {
      document.documentElement.style.setProperty('--crm-blue', settings.primaryColor);
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
    }
  }, [settings?.primaryColor]);

  return null;
} 