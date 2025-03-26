import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsPageTemplate } from "@/components/settings/SettingsPageTemplate";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, X, Shield, UserMinus, UserPlus, ChevronsUpDown } from "lucide-react";
import { EditUserDetailsModal } from "@/components/settings/EditUserDetailsModal";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { AddUserModal } from "@/components/settings/AddUserModal";
import { useToast } from "@/components/ui/use-toast";
import * as userService from "@/services/userService";
import { User as FirestoreUser } from "@/services/userService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { createAdminUser, promoteToAdmin } from "@/scripts/createAdmin";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

// Define user data structure for the component
interface User {
  id: string;
  name: string;
  username: string;
  active: boolean;
  email?: string;
  phoneNumber?: string;
  schoolCode?: string;
  sourceForLeads?: string;
  reportsTo?: string;
  logo?: File | null;
  role?: string;
  createdAt?: Date;
}

// Define admin user structure
interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: Date;
}

const UserSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");

  // General User Management state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Admin Management state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [sortField, setSortField] = useState<keyof AdminUser>("displayName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { currentUser } = useAuth();

  // Fetch regular users from Firestore
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const firestoreUsers = await userService.getAllUsers();
      
      // Map Firestore users to component users
      const mappedUsers: User[] = firestoreUsers.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        active: user.active,
        email: user.email,
        phoneNumber: user.phoneNumber,
        schoolCode: user.schoolCode,
        sourceForLeads: user.sourceForLeads,
        reportsTo: user.reportsTo,
        role: user.role
      }));
      
      setUsers(mappedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users for admin management
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      
      const fetchedUsers: AdminUser[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        fetchedUsers.push({
          id: doc.id,
          email: userData.email || "",
          displayName: userData.displayName || userData.name || "",
          role: userData.role || "user",
          createdAt: userData.createdAt?.toDate() || new Date(),
        });
      });
      
      setAdminUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "general") {
      fetchUsers();
    } else if (activeTab === "admin") {
      fetchAdminUsers();
    }
  }, [activeTab, toast]);

  // Filter admin users based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(adminUsers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = adminUsers.filter(
        (user) =>
          user.displayName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [adminUsers, searchQuery]);

  // Sort admin users based on selected field and direction
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

  // Handle sorting for admin users
  const handleSort = (field: keyof AdminUser) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // General User Management Functions
  const handleStatusChange = async (id: string) => {
    try {
      // Find the user and get current status
      const user = users.find(u => u.id === id);
      if (!user) return;
      
      // Update status in Firestore
      await userService.updateUserStatus(id, !user.active);
      
      // Update local state
      setUsers(
        users.map((user) =>
          user.id === id ? { ...user, active: !user.active } : user
        )
      );
      
      toast({
        title: "User status updated",
        description: `User ${user.name} is now ${!user.active ? 'active' : 'inactive'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleEditDetails = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setChangePasswordModalOpen(true);
  };

  const handleUserSettings = (userId: string) => {
    navigate(`/settings/user/subcrm-settings/${userId}`);
  };

  const handleSaveUserDetails = async (updatedUser: User) => {
    try {
      // Prepare data for Firestore (exclude non-db fields)
      const { logo, ...userDataForFirestore } = updatedUser;
      
      // Update user in Firestore
      await userService.updateUser(updatedUser.id, userDataForFirestore);
      
      // Update local state
      setUsers(
        users.map((user) =>
          user.id === updatedUser.id ? { ...updatedUser } : user
        )
      );
      
      toast({
        title: "User updated",
        description: `User ${updatedUser.name} has been updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  // Admin Management Functions
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
        setAdminUsers((prevUsers) => [
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
      setAdminUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: "Success",
        description: `User role updated to ${newRole}.`,
        variant: "default",
      });
      
      // Also refresh general users if they're loaded
      if (users.length > 0) {
        fetchUsers();
      }
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

  const userCount = users.length;

  return (
    <SettingsPageTemplate
      title="User Management"
      description="Manage user accounts, permissions, and admin roles"
    >
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="general">General User Management</TabsTrigger>
          <TabsTrigger value="admin">Admin Role Management</TabsTrigger>
        </TabsList>
        
        {/* General User Management Tab */}
        <TabsContent value="general">
          <div className="mb-8">
            <div className="bg-red-500 text-white p-4 rounded-md shadow-md w-96">
              <h2 className="text-3xl font-bold mb-1">{userCount}</h2>
              <div className="flex justify-between items-center">
                <p>Users</p>
                <Button 
                  variant="ghost" 
                  className="text-white border border-white hover:bg-red-600"
                  size="sm"
                  onClick={() => setAddModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add New
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-md">
            {loading && activeTab === "general" ? (
              <div className="p-8 text-center">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-16">Sr No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-64">Action</TableHead>
                    <TableHead className="w-48 text-center">Status (Inactive/Active)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id} className="border-b">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
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
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="bg-blue-500 hover:bg-blue-600 text-xs"
                            onClick={() => handleChangePassword(user)}
                          >
                            Change Password
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="bg-blue-500 hover:bg-blue-600 text-xs"
                            onClick={() => handleUserSettings(user.id)}
                          >
                            Settings
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="bg-blue-500 hover:bg-blue-600 text-xs"
                            onClick={() => handleEditDetails(user)}
                          >
                            Edit Details
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={user.active} 
                          onCheckedChange={() => handleStatusChange(user.id)} 
                          className="ml-auto mr-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="border-blue-500 text-blue-500 mr-2">
              Move to Other Branch
            </Button>
            <Button variant="default" className="bg-blue-500 hover:bg-blue-600">
              Export All Subcrm Data
            </Button>
          </div>
        </TabsContent>
        
        {/* Admin Role Management Tab */}
        <TabsContent value="admin">
          <div className="space-y-6">
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
                    {loading && activeTab === "admin" ? (
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
        </TabsContent>
      </Tabs>

      {/* Modals for General User Management */}
      {selectedUser && (
        <>
          <EditUserDetailsModal
            user={selectedUser}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSave={handleSaveUserDetails}
          />
          <ChangePasswordModal
            user={selectedUser}
            open={changePasswordModalOpen}
            onOpenChange={setChangePasswordModalOpen}
          />
        </>
      )}
      <AddUserModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onUserAdded={fetchUsers}
      />
    </SettingsPageTemplate>
  );
};

export default UserSettings;
