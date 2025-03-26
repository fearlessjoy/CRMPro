import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Log environment variables availability (without exposing sensitive data)
console.log('Environment variables status:', {
  VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
  VITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
  VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
  VITE_FIREBASE_STORAGE_BUCKET: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing',
  VITE_FIREBASE_MESSAGING_SENDER_ID: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
  VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID ? 'Present' : 'Missing'
});

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let db;
let storage;
let auth;

try {
  console.log('Checking for existing Firebase app...');
  
  // Initialize Firebase - only initialize if no apps exist
  if (getApps().length === 0) {
    console.log('No existing Firebase app found, initializing new app');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('Using existing Firebase app');
    app = getApp();
  }
  console.log('Firebase app initialized successfully');

  // Initialize Firestore
  db = getFirestore(app);
  console.log('Firestore initialized successfully');

  // Initialize Storage
  storage = getStorage(app);
  console.log('Storage initialized successfully');

  // Initialize Auth
  auth = getAuth(app);
  console.log('Auth initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { db, storage, auth };
export default app; 