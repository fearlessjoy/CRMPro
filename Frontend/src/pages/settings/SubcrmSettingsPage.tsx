import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { SubcrmSettings } from "@/components/settings/SubcrmSettings";
import { getUserById } from "@/services/userService";
import { useToast } from "@/components/ui/use-toast";

// Define user data structure
interface User {
  id: string;
  name: string;
  username: string;
  active: boolean;
  email?: string;
  phoneNumber?: string;
}

const SubcrmSettingsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await getUserById(userId);
        
        if (userData) {
          setUser({
            id: userData.id,
            name: userData.name,
            username: userData.username,
            active: userData.active,
            email: userData.email,
            phoneNumber: userData.phoneNumber
          });
        } else {
          toast({
            title: "User not found",
            description: "The requested user could not be found",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, toast]);

  if (loading) {
    return <div className="p-8 text-center">Loading user data...</div>;
  }

  if (!user) {
    return <div className="p-8">User not found</div>;
  }

  return <SubcrmSettings userName={user.name} />;
};

export default SubcrmSettingsPage; 