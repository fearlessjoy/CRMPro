import { useState, useEffect } from "react";
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

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  schoolCode?: string;
  sourceForLeads?: string;
  reportsTo?: string;
  logo?: File | null;
}

interface EditUserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
}

export function EditUserDetailsModal({
  open,
  onOpenChange,
  user,
  onSave,
}: EditUserDetailsModalProps) {
  const [formData, setFormData] = useState<User | null>(user);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData && user) {
      onSave({ ...formData, logo: selectedFile });
      onOpenChange(false);
    }
  };

  const renderForm = () => {
    if (!user || !formData) return <p>No user data available</p>;
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name:</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username:</Label>
          <Input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Id:</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number:</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber || ""}
            onChange={handleInputChange}
          />
        </div>
                        
        <div className="space-y-2">
          <Label htmlFor="sourceForLeads">Source for Leads:</Label>
          <Input
            id="sourceForLeads"
            name="sourceForLeads"
            placeholder="Type Here..."
            value={formData.sourceForLeads || ""}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reportsTo">Select Manager whom this User will report:</Label>
          <Select 
            value={formData.reportsTo || ""} 
            onValueChange={(value) => setFormData({ ...formData, reportsTo: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a user to report to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dinisha_davis">Dinisha Davis</SelectItem>
              <SelectItem value="uma_vinod">Uma Vinod</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
            Submit
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-red-500">Change Details</DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  );
} 