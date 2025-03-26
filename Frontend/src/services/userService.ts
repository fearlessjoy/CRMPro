import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/firebase/config";

// User interface
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
  active: boolean;
  schoolCode?: string;
  sourceForLeads?: string;
  reportsTo?: string;
  role?: string;
  createdAt: Date;
  updatedAt?: Date;
  displayName: string;
}

// Collection name
const USERS_COLLECTION = "users";

// Cache user data to avoid multiple Firestore calls
const userCache = new Map<string, User>();

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  // Check cache first
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  try {
    console.log('Fetching user data for ID:', userId); // Debug log
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const user = {
        id: userDoc.id,
        ...userData,
        // Ensure we have proper display name handling
        displayName: userData.displayName || userData.name || userData.email || 'Unknown User',
        // Ensure we have a name field
        name: userData.name || userData.displayName || userData.email || 'Unknown User'
      } as User;
      
      console.log('User data found:', user); // Debug log
      // Store in cache
      userCache.set(userId, user);
      return user;
    }
    
    console.log('No user found for ID:', userId); // Debug log
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Create a new user
export const createUser = async (user: Omit<User, "id">): Promise<User> => {
  try {
    const newUserRef = doc(collection(db, USERS_COLLECTION));
    await setDoc(newUserRef, {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get the user with the newly created ID
    const newUser = await getDoc(newUserRef);
    
    return { id: newUser.id, ...newUser.data() } as User;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Update a user
export const updateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...userData,
      updatedAt: new Date()
    });
    // Clear cache when needed (e.g., after user updates)
    userCache.clear();
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    // Clear cache when needed (e.g., after user deletion)
    userCache.clear();
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Update user status (active/inactive)
export const updateUserStatus = async (userId: string, active: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      active,
      updatedAt: new Date()
    });
    // Clear cache when needed (e.g., after user status update)
    userCache.clear();
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

// Get users by role
export const getUsersByRole = async (role: string): Promise<User[]> => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("role", "==", role));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error("Error getting users by role:", error);
    throw error;
  }
};

// Get active users
export const getActiveUsers = async (): Promise<User[]> => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("active", "==", true));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error("Error getting active users:", error);
    throw error;
  }
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      return {
        id: userDoc.id,
        ...userData,
        // Ensure we have proper display name handling
        displayName: userData.displayName || userData.name || userData.email || 'Unknown User',
        // Ensure we have a name field
        name: userData.name || userData.displayName || userData.email || 'Unknown User'
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
};

// Clear cache when needed (e.g., after user updates)
export const clearUserCache = () => {
  userCache.clear();
}; 