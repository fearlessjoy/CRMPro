import { Route, Routes } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Invoices from "@/pages/Invoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Settings from "@/pages/Settings";
import SocialMediaIntegration from "@/pages/settings/SocialMediaIntegration";
import LeadLogin from "@/pages/LeadLogin";
import LeadPortal from "@/pages/LeadPortal";
import Layout from "@/components/Layout";

// Public routes (accessible without login)
const PublicRoutes = () => (
  <Routes>
    <Route path="/lead-login" element={<LeadLogin />} />
    <Route path="/lead-portal/:leadId" element={<LeadPortal />} />
    <Route path="/*" element={<LeadLogin />} />
  </Routes>
);

// Protected routes (requires login)
const ProtectedRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/leads/:leadId" element={<LeadDetail />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/invoices/:invoiceId" element={<InvoiceDetail />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/social-media-integration" element={<SocialMediaIntegration />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  </Layout>
);

const AppRoutes = () => {
  // Simple check if we're in the lead portal or not
  const isLeadPortal = window.location.pathname.includes('lead-portal') || 
                        window.location.pathname.includes('lead-login');
  
  return isLeadPortal ? <PublicRoutes /> : <ProtectedRoutes />;
};

export default AppRoutes; 