// Firebase configuration for backend
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Cache for Firebase app instance
let firebaseApp = null;
let firestoreDb = null;

/**
 * Initialize Firebase if it hasn't been initialized yet
 * @returns {Object} Firebase app instance
 */
function getFirebaseApp() {
  try {
    if (firebaseApp) {
      console.log('Using existing Firebase app');
      return firebaseApp;
    }
    
    // Check if required env variables are set
    if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Firebase configuration is missing. Make sure FIREBASE_API_KEY and FIREBASE_PROJECT_ID are set in your .env file');
    }
    
    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || ""
    };
    
    // Log config without sensitive values
    console.log('Initializing Firebase with config:', { 
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKeyProvided: !!firebaseConfig.apiKey,
      appIdProvided: !!firebaseConfig.appId
    });
    
    // Check if any Firebase apps have been initialized
    if (getApps().length > 0) {
      console.log('Firebase already initialized, getting existing app');
      firebaseApp = getApp();
    } else {
      console.log('Initializing new Firebase app');
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

/**
 * Get Firestore database instance
 * @returns {Object} Firestore database instance
 */
function getFirestoreDb() {
  try {
    if (firestoreDb) {
      return firestoreDb;
    }
    
    const app = getFirebaseApp();
    console.log('Getting Firestore DB for app:', app.name);
    firestoreDb = getFirestore(app);
    
    // Use emulator in development if configured
    if (process.env.NODE_ENV === 'development' && process.env.USE_FIRESTORE_EMULATOR === 'true') {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost';
      const emulatorPort = process.env.FIRESTORE_EMULATOR_PORT || 8080;
      console.log(`Connecting to Firestore emulator at ${emulatorHost}:${emulatorPort}`);
      connectFirestoreEmulator(firestoreDb, emulatorHost, parseInt(emulatorPort, 10));
    }
    
    return firestoreDb;
  } catch (error) {
    console.error('Error getting Firestore DB:', error);
    throw error;
  }
}

// Create a test document to verify connection
async function testFirestoreConnection() {
  try {
    const db = getFirestoreDb();
    const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
    
    // Attempt to write a test document
    const testDocRef = await addDoc(collection(db, '_connection_test'), {
      timestamp: serverTimestamp(),
      message: 'Connection test successful',
      environment: process.env.NODE_ENV || 'unknown'
    });
    
    console.log('Firestore connection test successful. Test document ID:', testDocRef.id);
    return true;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
}

module.exports = {
  getFirebaseApp,
  getFirestoreDb,
  testFirestoreConnection
}; 