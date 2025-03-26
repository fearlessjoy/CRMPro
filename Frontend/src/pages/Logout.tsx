import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Log the user out
        await logout();
        
        // Show success message
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
          variant: "default",
        });
        
        // Redirect to login page
        navigate("/login");
      } catch (error) {
        console.error("Error logging out:", error);
        
        // Show error message
        toast({
          title: "Logout failed",
          description: "There was an error logging out. Please try again.",
          variant: "destructive",
        });
        
        // Redirect to home page anyway
        navigate("/");
      }
    };

    performLogout();
  }, [logout, navigate, toast]);

  // Show a loading message while logging out
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging out...</h1>
        <p>Please wait while we log you out.</p>
      </div>
    </div>
  );
};

export default Logout; 