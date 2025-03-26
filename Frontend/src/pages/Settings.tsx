import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Eye, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Define the settings data structure
interface SettingItem {
  id: number;
  name: string;
  path: string;
  adminOnly: boolean;
}

const settingsItems: SettingItem[] = [
  { id: 1, name: "User Settings", path: "/settings/user", adminOnly: true },
  { id: 2, name: "Abroad Invoice Settings", path: "/settings/invoice", adminOnly: true },
  { id: 3, name: "Documents Checklist", path: "/settings/documents", adminOnly: true },
  { id: 4, name: "Bulk Emailers", path: "/settings/bulk-emailers", adminOnly: true },
  { id: 5, name: "Brevo Email Integration", path: "/settings/brevo", adminOnly: true },
  { id: 6, name: "Leads Setting", path: "/settings/leads", adminOnly: true },
  { id: 7, name: "Triggers", path: "/settings/triggers", adminOnly: true },
  { id: 8, name: "Task Reminder Checklist", path: "/settings/task-reminder", adminOnly: true },
  { id: 9, name: "Birthday Wishes", path: "/settings/birthday-wishes", adminOnly: true },
  { id: 10, name: "Company Settings", path: "/settings/company", adminOnly: true },
  { id: 11, name: "Social Media Integration", path: "/settings/social-media", adminOnly: true },
];

const Settings = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    console.log("Settings page - Current user role:", currentUser?.role);
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings Control Panel</h1>
        <p className="text-muted-foreground mt-1">Manage system settings and configurations</p>
      </div>

      {!isAdmin && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            You need administrator privileges to access most settings. Please contact your system administrator for assistance.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Sr No.</TableHead>
              <TableHead>Setting Name</TableHead>
              <TableHead className="w-[120px]">Access Level</TableHead>
              <TableHead className="text-right w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settingsItems.map((item) => (
              <TableRow key={item.id} className={item.adminOnly && !isAdmin ? "bg-gray-50" : ""}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>
                  {item.name}
                  {item.adminOnly && !isAdmin && (
                    <Lock className="h-3 w-3 ml-2 inline text-amber-500" />
                  )}
                </TableCell>
                <TableCell>
                  {item.adminOnly ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Admin Only
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      All Users
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant={item.adminOnly && !isAdmin ? "outline" : "default"} 
                    size="sm" 
                    className={item.adminOnly && !isAdmin ? 
                      "text-gray-400 hover:text-gray-500 w-20" : 
                      "bg-blue-500 hover:bg-blue-600 w-20"}
                    asChild
                    disabled={item.adminOnly && !isAdmin}
                  >
                    <Link to={isAdmin || !item.adminOnly ? item.path : "#"}>
                      {item.adminOnly && !isAdmin ? (
                        <>
                          <Lock className="h-4 w-4 mr-1" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </>
                      )}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Settings;
