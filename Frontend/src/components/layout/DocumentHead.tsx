import { useEffect } from 'react';
import { useAdminSettings } from '@/contexts/AdminSettingsContext';

export function DocumentHead() {
  const { settings } = useAdminSettings();

  useEffect(() => {
    // Update document title
    document.title = settings?.companyName || 'CRM Pro';

    // Update favicon if provided
    if (settings?.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = settings.favicon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = settings.favicon;
        document.head.appendChild(newLink);
      }
    }
  }, [settings]);

  return null;
} 