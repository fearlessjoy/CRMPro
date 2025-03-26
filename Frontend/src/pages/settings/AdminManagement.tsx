import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { createAdminUser, promoteToAdmin } from "@/scripts/createAdmin";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Search, Shield, UserMinus, UserPlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: Date;
}

const AdminManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [sortField, setSortField] = useState<keyof User>("displayName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "users"));
        
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          fetchedUsers.push({
            id: doc.id,
            email: userData.email || "",
            displayName: userData.displayName || "",
            role: userData.role || "user",
            createdAt: userData.createdAt?.toDate() || new Date(),
          });
        });
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.displayName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchQuery]);

  // Sort users based on selected field and direction
  useEffect(() => {
    const sorted = [...filteredUsers].sort((a, b) => {
      if (sortField === "createdAt") {
        const dateA = a[sortField];
        const dateB = b[sortField];
        return sortDirection === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else {
        const valueA = String(a[sortField]).toLowerCase();
        const valueB = String(b[sortField]).toLowerCase();
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
    });

    setFilteredUsers(sorted);
  }, [sortField, sortDirection]);

  const handleSort = (field: keyof User) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const userId = await createAdminUser(
        newAdminEmail,
        newAdminPassword,
        newAdminName
      );
      
      // Refresh user list with new admin
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      
      if (userData) {
        setUsers((prevUsers) => [
          ...prevUsers,
          {
            id: userId,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            createdAt: userData.createdAt.toDate(),
          },
        ]);
      }

      // Reset form and close dialog
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminName("");
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: `Admin user "${newAdminName}" created successfully.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create admin user: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Don't allow changing your own role
    if (userId === currentUser?.uid) {
      toast({
        title: "Error",
        description: "You cannot change your own role.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Update user role in Firestore
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
      });
      
      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: "Success",
        description: `User role updated to ${newRole}.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage admin users and roles in the system
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              className="absolute right-0 top-0 h-full px-2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Admin User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
              <DialogDescription>
                Create a new user with administrator privileges.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} disabled={loading}>
                Create Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>
            Manage access levels for system users. Be careful when changing roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <Button
                    variant="ghost"
                    className="text-left font-semibold p-0 h-auto"
                    onClick={() => handleSort("displayName")}
                  >
                    Name
                    <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="text-left font-semibold p-0 h-auto"
                    onClick={() => handleSort("email")}
                  >
                    Email
                    <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    className="text-left font-semibold p-0 h-auto"
                    onClick={() => handleSort("role")}
                  >
                    Role
                    <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {currentUser?.uid !== user.id ? (
                        user.role === "admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleRoleChange(user.id, "user")}
                          >
                            <UserMinus className="h-4 w-4" />
                            Demote
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleRoleChange(user.id, "admin")}
                          >
                            <UserPlus className="h-4 w-4" />
                            Promote
                          </Button>
                        )
                      ) : (
                        <Badge variant="outline" className="bg-gray-100">
                          Current User
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement; 