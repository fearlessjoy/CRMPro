import { SettingsPageTemplate } from "@/components/settings/SettingsPageTemplate";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const CompanySettings = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <SettingsPageTemplate
        title="Company Settings"
        description="Customize your company branding and appearance"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            You need administrator privileges to access company settings. Please contact your system administrator for assistance.
          </AlertDescription>
        </Alert>
      </SettingsPageTemplate>
    );
  }

  return (
    <SettingsPageTemplate
      title="Company Settings"
      description="Customize your company branding and appearance"
    >
      <AdminSettings />
    </SettingsPageTemplate>
  );
};

export default CompanySettings; 