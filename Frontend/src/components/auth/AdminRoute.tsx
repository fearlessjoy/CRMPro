import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface AdminRouteProps {
  redirectTo?: string;
}

export const AdminRoute = ({ redirectTo = "/" }: AdminRouteProps) => {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();

  // Add debugging on mount
  useEffect(() => {
    console.log("AdminRoute rendered:", { 
      isAuthenticated: !!currentUser, 
      loading, 
      userEmail: currentUser?.email,
      userRole: currentUser?.role
    });
  }, [currentUser, loading]);

  // If auth is still loading, show nothing or a loading spinner
  if (loading) {
    console.log("AdminRoute: Auth still loading");
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If user is not authenticated, redirect to login
  if (!currentUser) {
    console.log("AdminRoute: No authenticated user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but not an admin, redirect to specified path
  if (currentUser.role !== "admin") {
    console.log("AdminRoute: User is not an admin, redirecting to", redirectTo);
    
    // Show toast notification about insufficient permissions
    toast({
      title: "Access Denied",
      description: "You don't have permission to access this page.",
      variant: "destructive",
    });
    
    return <Navigate to={redirectTo} replace />;
  }

  // If user is authenticated and is an admin, render the children routes
  console.log("AdminRoute: Admin authenticated, rendering protected content");
  return <Outlet />;
}; 