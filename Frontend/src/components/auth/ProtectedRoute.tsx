import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface ProtectedRouteProps {
  redirectTo?: string;
}

export const ProtectedRoute = ({ redirectTo = "/login" }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();

  // Add debugging on mount
  useEffect(() => {
    console.log("ProtectedRoute rendered:", { 
      isAuthenticated: !!currentUser, 
      loading, 
      userEmail: currentUser?.email 
    });
  }, [currentUser, loading]);

  // If auth is still loading, show nothing or a loading spinner
  if (loading) {
    console.log("ProtectedRoute: Auth still loading");
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If user is not authenticated, redirect to login
  if (!currentUser) {
    console.log("ProtectedRoute: No authenticated user, redirecting to", redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // If user is authenticated, render the children routes
  console.log("ProtectedRoute: User authenticated, rendering protected content");
  return <Outlet />;
}; 