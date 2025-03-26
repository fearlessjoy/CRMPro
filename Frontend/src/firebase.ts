// Firebase configuration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Replace with your Firebase project configuration
// These values should be the same as in your Backend/.env file
export const firebaseConfig = {
  apiKey: "AIzaSyD_Replace_With_Your_Actual_API_Key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Print a warning about config
console.log('IMPORTANT: Make sure to replace the Firebase configuration values with your actual project settings');

// Initialize Firebase - only initialize if no apps exist
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth }; 