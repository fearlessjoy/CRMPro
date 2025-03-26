import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import * as userService from "@/services/userService";
import { auth } from "@/firebase/config";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function AddUserModal({
  open,
  onOpenChange,
  onUserAdded,
}: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    schoolCode: "",
    sourceForLeads: "",
    reportsTo: "",
    active: true,
    role: "user"
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user selects
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });
      
      // Create the user record in Firestore
      await userService.createUser({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        schoolCode: formData.schoolCode,
        sourceForLeads: formData.sourceForLeads,
        reportsTo: formData.reportsTo,
        active: formData.active,
        role: formData.role,
        createdAt: new Date()
      });
      
      toast({
        title: "User created",
        description: `User ${formData.name} has been successfully created`,
      });
      
      // Reset form and close modal
      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        phoneNumber: "",
        schoolCode: "",
        sourceForLeads: "",
        reportsTo: "",
        active: true,
        role: "user"
      });
      
      onOpenChange(false);
      onUserAdded();
      
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      if (error.code === "auth/email-already-in-use") {
        setErrors({ email: "Email is already in use" });
        toast({
          title: "Error",
          description: "Email is already in use",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create user",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-red-500">Add New User</DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name: <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username: <span className="text-red-500">*</span></Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter username"
              className={errors.username ? "border-red-500" : ""}
            />
            {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email: <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password: <span className="text-red-500">*</span></Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password: <span className="text-red-500">*</span></Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm password"
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number:</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="schoolCode">School Code:</Label>
            <Input
              id="schoolCode"
              name="schoolCode"
              value={formData.schoolCode}
              onChange={handleInputChange}
              placeholder="Enter school code"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sourceForLeads">Source for Leads:</Label>
            <Input
              id="sourceForLeads"
              name="sourceForLeads"
              value={formData.sourceForLeads}
              onChange={handleInputChange}
              placeholder="Enter source for leads"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reportsTo">Reports To:</Label>
            <Select 
              value={formData.reportsTo} 
              onValueChange={(value) => handleSelectChange("reportsTo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinisha_davis">Dinisha Davis</SelectItem>
                <SelectItem value="uma_vinod">Uma Vinod</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role:</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => handleSelectChange("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="active">Active:</Label>
            <Switch 
              id="active" 
              checked={formData.active} 
              onCheckedChange={(checked) => handleSwitchChange("active", checked)} 
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="mr-2" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="bg-blue-500 hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 