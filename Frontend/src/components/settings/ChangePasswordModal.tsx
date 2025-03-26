import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { auth } from "@/firebase/config";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ChangePasswordModal({ 
  open, 
  onOpenChange, 
  userId,
  userName
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Reset error
    setError("");

    // Validate passwords
    if (!currentPassword || !newPassword || !retypePassword) {
      setError("All password fields are required");
      return;
    }

    if (newPassword !== retypePassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        setError("No authenticated user found");
        return;
      }
      
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      // Success message
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully",
      });
      
      // Close the modal and reset fields
      onOpenChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setRetypePassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      if (error.code === "auth/wrong-password") {
        setError("Current password is incorrect");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many unsuccessful attempts. Please try again later");
      } else {
        setError("Failed to change password. Please try again");
      }
      
      toast({
        title: "Password change failed",
        description: error.code === "auth/wrong-password" 
          ? "Current password is incorrect" 
          : "An error occurred while changing password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-red-500 p-4 -mx-6 -mt-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-white text-xl font-semibold">Change Password</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-red-600 rounded-full h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-2 pt-4">
          {error && (
            <div className="mb-4 text-red-500 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password:</Label>
              <Input 
                id="current-password" 
                type="password" 
                placeholder="Type Here..." 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password:</Label>
              <Input 
                id="new-password" 
                type="password" 
                placeholder="Type Here..." 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="retype-password">Retype New Password:</Label>
              <Input 
                id="retype-password" 
                type="password" 
                placeholder="Type Here..." 
                value={retypePassword}
                onChange={(e) => setRetypePassword(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Changing..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 