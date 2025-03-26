// @ts-nocheck
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqwZcpuOKZ9uCVZEBgynbxaaH_dtr_AMk",
  authDomain: "crm-pro-e2df3.firebaseapp.com",
  projectId: "crm-pro-e2df3",
  storageBucket: "crm-pro-e2df3.firebasestorage.app",
  messagingSenderId: "201619768522",
  appId: "1:201619768522:web:62bb56cd9422ac2fac2033",
  measurementId: "G-WJ50R2T4SF"
};

// Initialize Firebase - only initialize if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Test user data
const testUsers = [
  {
    email: "remya@jobseekers.co.nz",
    password: "password123",
    name: "Remya Menon",
    username: "remya",
    active: true,
    phoneNumber: "917907303866",
    role: "admin"
  },
  {
    email: "hince@jobseekers.co.nz",
    password: "password123",
    name: "Hince Joy",
    username: "hince_joy",
    active: false,
    role: "user"
  },
  {
    email: "jejson@jobseekers.co.nz",
    password: "password123",
    name: "Jejson Jose",
    username: "jejson.jose",
    active: false,
    role: "user"
  },
  {
    email: "dominic@jobseekers.co.nz",
    password: "password123",
    name: "Darlin Dominic",
    username: "dominic",
    active: false,
    role: "user"
  },
  {
    email: "sandra@jobseekers.co.nz",
    password: "password123",
    name: "Sandra Biju",
    username: "sandra",
    active: true,
    role: "subcrm",
    reportsTo: "uma_vinod"
  },
  {
    email: "uma@jobseekers.co.nz",
    password: "password123",
    name: "Uma Vinod",
    username: "uma_vinod",
    active: true,
    role: "manager"
  }
];

// Function to initialize database with test data
async function initializeDatabase() {
  console.log("Initializing database with test users...");
  
  for (const userData of testUsers) {
    try {
      // Create user in Firebase Auth
      const { email, password, name, ...otherData } = userData;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: name
      });
      
      // Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        name,
        ...otherData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Created user: ${name} (${email})`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        console.log(`User already exists: ${userData.email}`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }
  }
  
  console.log("Database initialization complete");
}

// Run the initialization
initializeDatabase()
  .then(() => console.log("Script execution completed"))
  .catch(error => console.error("Script execution failed:", error));

/*
To run this script:
1. Save it as a .js file
2. Run using node: node src/scripts/initFirebase.js
*/ 