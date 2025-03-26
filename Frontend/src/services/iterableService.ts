/**
 * Iterable Marketing Integration Service
 * 
 * This service is a placeholder for future Iterable integration.
 * It provides a no-op implementation to suppress errors in the console.
 */

// Define the interface for in-app messages error silencing
interface IterableInAppManager {
  getMessages: () => any[];
  showMessage: (message: any) => void;
  setAutoDisplayPaused: (paused: boolean) => void;
}

// Define our minimal SDK implementation
interface IterableSdk {
  initialize: (apiKey: string) => void;
  setEmail: (email: string) => void;
  trackEvent: (name: string, data?: any) => void;
  updateUser: (data: any) => void;
  inAppManager: IterableInAppManager;
}

// Create a dummy implementation that silences errors
const dummyInAppManager: IterableInAppManager = {
  getMessages: () => {
    console.log('Iterable (mock): Getting in-app messages');
    return [];
  },
  showMessage: (message: any) => {
    console.log('Iterable (mock): Would show message', message);
  },
  setAutoDisplayPaused: (paused: boolean) => {
    console.log(`Iterable (mock): Auto display ${paused ? 'paused' : 'resumed'}`);
  }
};

// Create a dummy implementation that logs but doesn't error
const mockIterableSDK: IterableSdk = {
  initialize: (apiKey: string) => {
    console.log('Iterable (mock): Initialized with API key', apiKey);
  },
  setEmail: (email: string) => {
    console.log('Iterable (mock): Set email to', email);
  },
  trackEvent: (name: string, data?: any) => {
    console.log('Iterable (mock): Tracked event', name, data);
  },
  updateUser: (data: any) => {
    console.log('Iterable (mock): Updated user', data);
  },
  inAppManager: dummyInAppManager
};

// Attach our mock implementation to the window to silence errors
if (typeof window !== 'undefined') {
  (window as any).iterableSDK = mockIterableSDK;
}

/**
 * Initialize the Iterable integration
 */
export const initializeIterable = (apiKey: string, email?: string): void => {
  console.log('Iterable (mock): Initialized integration', { apiKey, email });
  
  // If needed, you can replace this with actual Iterable SDK initialization later
  if (email) {
    mockIterableSDK.setEmail(email);
  }
};

/**
 * Track an event in Iterable
 */
export const trackEvent = (eventName: string, data?: Record<string, any>): void => {
  mockIterableSDK.trackEvent(eventName, data);
};

/**
 * Update a user in Iterable
 */
export const updateUser = (email: string, data: Record<string, any>): void => {
  mockIterableSDK.setEmail(email);
  mockIterableSDK.updateUser(data);
};

// Export our mock implementation for testing or debugging
export default mockIterableSDK; 