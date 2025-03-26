import { useEffect } from 'react';
import brevoEmailService from '@/services/brevoEmailService';

/**
 * Hook to initialize Brevo email service when the application starts
 * It loads the API key from localStorage if available
 */
export function useBrevoInit(): void {
  useEffect(() => {
    const apiKey = localStorage.getItem('brevo_api_key');
    
    if (apiKey) {
      brevoEmailService.setApiKey(apiKey);
      console.log('Brevo email service initialized');
    } else {
      console.log('Brevo API key not found in localStorage');
    }
  }, []);
}

export default useBrevoInit; 