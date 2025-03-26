import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Define user type
interface User extends FirebaseUser {
  role?: string;
}

// Define context type
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  async function signup(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      
      // Store additional user info in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        displayName,
        role: "user",
        createdAt: new Date()
      });
      
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  }

  // Login function
  async function login(email: string, password: string) {
    try {
      console.log("Login attempt for:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful for:", userCredential.user.email);
      
      // Wait for the onAuthStateChanged to update currentUser
      return userCredential.user;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  // Logout function
  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(displayName: string) {
    if (!auth.currentUser) return;
    
    try {
      await updateProfile(auth.currentUser, { displayName });
      // Update user state
      setCurrentUser({
        ...currentUser!,
        displayName
      } as User);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }
  
  // Check if current user is an admin
  function isAdmin() {
    return currentUser?.role === 'admin';
  }

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User logged in: ${user.email}` : "User logged out");
      
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          
          // Combine Firebase user with custom data
          const enhancedUser = {
            ...user,
            role: userData?.role || 'user'
          } as User;
          
          setCurrentUser(enhancedUser);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Still set the basic user info even if Firestore fetch fails
          setCurrentUser(user as User);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    signup,
    updateUserProfile,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 