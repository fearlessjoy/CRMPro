import { auth, db } from "@/firebase/config";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

/**
 * Create a new admin user in Firebase
 * 
 * @param email Admin user's email
 * @param password Admin user's password
 * @param displayName Admin user's display name
 * @returns Promise resolving to the admin user's ID
 */
export const createAdminUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<string> => {
  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    const userId = userCredential.user.uid;
    
    // Add user to Firestore with admin role
    await setDoc(doc(db, "users", userId), {
      email,
      displayName,
      role: "admin", // Set role as admin
      createdAt: new Date()
    });
    
    console.log(`Admin user created successfully with ID: ${userId}`);
    return userId;
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  }
};

/**
 * Update an existing user to have admin role
 * 
 * @param userId ID of the user to promote to admin
 * @returns Promise resolving to a boolean indicating success
 */
export const promoteToAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error(`User with ID ${userId} does not exist`);
      return false;
    }
    
    // Update user role to admin
    await updateDoc(userRef, {
      role: "admin"
    });
    
    console.log(`User ${userId} has been promoted to admin role`);
    return true;
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    throw error;
  }
};

/**
 * Function to run from the browser console to create an admin user
 * Example usage: 
 * - Import the script in a component temporarily
 * - Call window.createAdmin("admin@example.com", "password", "Admin User")
 */
if (typeof window !== "undefined") {
  (window as any).createAdmin = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      const userId = await createAdminUser(email, password, displayName);
      return `Admin user created with ID: ${userId}`;
    } catch (error) {
      console.error("Failed to create admin:", error);
      return `Error: ${error}`;
    }
  };
  
  (window as any).promoteUserToAdmin = async (userId: string) => {
    try {
      const success = await promoteToAdmin(userId);
      return success
        ? `User ${userId} promoted to admin successfully`
        : `Failed to promote user ${userId} to admin`;
    } catch (error) {
      console.error("Failed to promote user:", error);
      return `Error: ${error}`;
    }
  };
} 