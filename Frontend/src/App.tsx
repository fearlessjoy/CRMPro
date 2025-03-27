import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminSettingsProvider } from "@/contexts/AdminSettingsContext";
import { DocumentHead } from "@/components/layout/DocumentHead";
import { DynamicStyles } from "@/components/layout/DynamicStyles";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as leadProcessService from "@/services/leadProcessService";
import { SearchProvider } from "@/components/providers/SearchProvider";

import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import IVR from "@/pages/IVR";
import Invoices from "@/pages/Invoices";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/NotFound";
import Logout from "@/pages/Logout";

// Import the settings detail pages
import UserSettings from "@/pages/settings/UserSettings";
import ChannelSettings from "@/pages/settings/ChannelSettings";
import InvoiceSettings from "@/pages/settings/InvoiceSettings";
import QuestionsSettings from "@/pages/settings/QuestionsSettings";
import DocumentsSettings from "@/pages/settings/DocumentsSettings";
import BulkEmailersSettings from "@/pages/settings/BulkEmailersSettings";
import LeadsSettings from "@/pages/settings/LeadsSettings";
import DiskSpaceSettings from "@/pages/settings/DiskSpaceSettings";
import TriggersSettings from "@/pages/settings/TriggersSettings";
import MarketingAutomationSettings from "@/pages/settings/MarketingAutomationSettings";
import WhatsappAutomationSettings from "@/pages/settings/WhatsappAutomationSettings";
import FormsSettings from "@/pages/settings/FormsSettings";
import TaskReminderSettings from "@/pages/settings/TaskReminderSettings";
import ExternalLinksSettings from "@/pages/settings/ExternalLinksSettings";
import LoginDetailsSettings from "@/pages/settings/LoginDetailsSettings";
import BirthdayWishesSettings from "@/pages/settings/BirthdayWishesSettings";
import SubcrmSettingsPage from "@/pages/settings/SubcrmSettingsPage";
import CompanySettings from "@/pages/settings/CompanySettings";
import SocialMediaIntegration from "@/pages/settings/SocialMediaIntegration";
import BrevoSettings from "@/pages/settings/BrevoSettings";

// Add import for LeadDetail
import LeadDetail from "@/pages/LeadDetail";

// Import Lead Portal pages
import LeadLogin from "@/pages/LeadLogin";
import LeadPortal from "@/pages/LeadPortal";

import useBrevoInit from "@/hooks/useBrevoInit";
import { DashboardLayoutProvider } from "@/contexts/DashboardLayoutContext";

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();

  // Initialize Lead Process
  useEffect(() => {
    const initializeLeadProcess = async () => {
      try {
        await leadProcessService.ensureLeadProcessExists();
      } catch (error) {
        console.error("Error initializing Lead Process:", error);
        toast({
          title: "Warning",
          description: "Failed to initialize Lead Process. Some features may not work correctly.",
          variant: "destructive",
        });
      }
    };

    initializeLeadProcess();
  }, [toast]);

  // Initialize Brevo email service
  useBrevoInit();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminSettingsProvider>
          <DocumentHead />
          <DynamicStyles />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SearchProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/logout" element={<Logout />} />
                  
                  {/* Lead Portal routes - publicly accessible */}
                  <Route path="/lead-login" element={<LeadLogin />} />
                  <Route path="/lead-portal/:leadId" element={<LeadPortal />} />
                  
                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                      <Route path="/" element={<DashboardLayoutProvider><Dashboard /></DashboardLayoutProvider>} />
                      <Route path="/leads" element={<Leads />} />
                      <Route path="/leads/:leadId" element={<LeadDetail />} />
                      <Route path="/ivr" element={<IVR />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/reports" element={<Reports />} />
                      
                      {/* Settings main page */}
                      <Route path="/settings" element={<Settings />} />
                      
                      {/* Admin only routes */}
                      <Route element={<AdminRoute />}>
                        {/* Settings sub-pages */}
                        <Route path="/settings/user" element={<UserSettings />} />
                        <Route path="/settings/user/subcrm-settings/:userId" element={<SubcrmSettingsPage />} />
                        <Route path="/settings/channel" element={<ChannelSettings />} />
                        <Route path="/settings/invoice" element={<InvoiceSettings />} />
                        <Route path="/settings/questions" element={<QuestionsSettings />} />
                        <Route path="/settings/documents" element={<DocumentsSettings />} />
                        <Route path="/settings/bulk-emailers" element={<BulkEmailersSettings />} />
                        <Route path="/settings/leads" element={<LeadsSettings />} />
                        <Route path="/settings/disk-space" element={<DiskSpaceSettings />} />
                        <Route path="/settings/triggers" element={<TriggersSettings />} />
                        <Route path="/settings/marketing-automation" element={<MarketingAutomationSettings />} />
                        <Route path="/settings/whatsapp-automation" element={<WhatsappAutomationSettings />} />
                        <Route path="/settings/forms" element={<FormsSettings />} />
                        <Route path="/settings/task-reminder" element={<TaskReminderSettings />} />
                        <Route path="/settings/external-links" element={<ExternalLinksSettings />} />
                        <Route path="/settings/login-details" element={<LoginDetailsSettings />} />
                        <Route path="/settings/birthday-wishes" element={<BirthdayWishesSettings />} />
                        <Route path="/settings/company" element={<CompanySettings />} />
                        <Route path="/settings/social-media" element={<SocialMediaIntegration />} />
                        <Route path="/settings/social-media/callback" element={<SocialMediaIntegration />} />
                        <Route path="/settings/brevo" element={<BrevoSettings />} />
                      </Route>
                    </Route>
                  </Route>
                  
                  {/* Default redirect */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SearchProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AdminSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
