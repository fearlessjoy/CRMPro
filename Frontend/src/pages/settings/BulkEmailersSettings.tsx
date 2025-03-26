import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { serverTimestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

import * as emailTemplateService from "@/services/emailTemplateService";
import * as emailCampaignService from "@/services/emailCampaignService";
import * as emailStatisticsService from "@/services/emailStatisticsService";
import { EmailTemplate } from "@/services/emailTemplateService";
import { EmailCampaign } from "@/services/emailCampaignService";
import { EmailStatistics, calculateStatistics } from "@/services/emailStatisticsService";
import { useAuth } from "@/contexts/AuthContext";
import { manuallyUpdateOpenCount } from '@/services/emailCampaignService';
import { sendTestEmailWithTracking } from "@/services/emailCampaignService";

// Editor component
const EmailEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const handleFormat = (format: string) => {
    // Basic formatting functions
    const formats: Record<string, () => void> = {
      bold: () => {
        const selection = window.getSelection()?.toString();
        if (selection) {
          const newValue = value.replace(selection, `<strong>${selection}</strong>`);
          onChange(newValue);
        }
      },
      italic: () => {
        const selection = window.getSelection()?.toString();
        if (selection) {
          const newValue = value.replace(selection, `<em>${selection}</em>`);
          onChange(newValue);
        }
      },
      underline: () => {
        const selection = window.getSelection()?.toString();
        if (selection) {
          const newValue = value.replace(selection, `<u>${selection}</u>`);
          onChange(newValue);
        }
      },
      link: () => {
        const selection = window.getSelection()?.toString();
        const url = prompt("Enter URL:", "https://");
        if (selection && url) {
          const newValue = value.replace(selection, `<a href="${url}" target="_blank">${selection}</a>`);
          onChange(newValue);
        }
      },
      image: () => {
        const url = prompt("Enter image URL:", "https://");
        const alt = prompt("Enter image alt text:", "");
        if (url) {
          const imageTag = `<img src="${url}" alt="${alt || ''}" style="max-width: 100%; height: auto;" />`;
          onChange(value + imageTag);
        }
      },
      heading: () => {
        const selection = window.getSelection()?.toString();
        if (selection) {
          const newValue = value.replace(selection, `<h2>${selection}</h2>`);
          onChange(newValue);
        }
      },
      bullet: () => {
        onChange(value + "\n<ul>\n  <li>List item</li>\n  <li>List item</li>\n</ul>");
      },
      number: () => {
        onChange(value + "\n<ol>\n  <li>List item</li>\n  <li>List item</li>\n</ol>");
      },
      hr: () => {
        onChange(value + "\n<hr />\n");
      },
      variable: () => {
        const variables = ["{{firstName}}", "{{lastName}}", "{{email}}", "{{company}}", "{{phone}}"];
        const selection = window.getSelection()?.toString();
        const selectedVar = prompt("Select a variable:", variables.join(", "));
        if (selectedVar && variables.includes(selectedVar)) {
          if (selection) {
            const newValue = value.replace(selection, selectedVar);
            onChange(newValue);
          } else {
            onChange(value + selectedVar);
          }
        }
      }
    };

    if (formats[format]) {
      formats[format]();
    }
  };

  return (
    <div className="border rounded-md">
      <div className="border-b px-3 py-2 flex items-center gap-2 bg-muted/50 flex-wrap">
        <div className="flex items-center gap-1 border-r pr-2">
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Bold"
            onClick={() => handleFormat('bold')}
          >
            <span className="font-bold">B</span>
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Italic"
            onClick={() => handleFormat('italic')}
          >
            <span className="italic">I</span>
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Underline"
            onClick={() => handleFormat('underline')}
          >
            <span className="underline">U</span>
          </button>
        </div>
        
        <div className="flex items-center gap-1 border-r pr-2">
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Heading"
            onClick={() => handleFormat('heading')}
          >
            H
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Bulleted List"
            onClick={() => handleFormat('bullet')}
          >
            • List
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Numbered List"
            onClick={() => handleFormat('number')}
          >
            1. List
          </button>
        </div>
          
        <div className="flex items-center gap-1 border-r pr-2">
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Insert Link"
            onClick={() => handleFormat('link')}
          >
            Link
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Insert Image"
            onClick={() => handleFormat('image')}
          >
            Image
          </button>
          <button 
            className="p-1 hover:bg-muted rounded" 
            title="Horizontal Rule"
            onClick={() => handleFormat('hr')}
          >
            Line
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-muted rounded text-blue-600" 
            title="Insert Variable"
            onClick={() => handleFormat('variable')}
          >
            Variables
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 border-b">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 focus-visible:ring-0 h-64 resize-none font-mono text-sm"
          placeholder="Write your email content here..."
        />
        <div className="p-4 border-l h-64 overflow-auto">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      </div>
      
      <div className="px-3 py-2 text-xs text-muted-foreground">
        <p>Use HTML tags for advanced formatting. Available variables: firstName, lastName, email, company, phone (surrounded by double curly braces).</p>
      </div>
    </div>
  );
};

const BulkEmailersSettings = () => {
  const [activeTab, setActiveTab] = useState("email-templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Template form state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
    isActive: true
  });
  
  // Campaign form state
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    body: "",
    recipients: [] as string[],
    status: "draft" as "draft" | "scheduled" | "sending" | "sent" | "failed",
    scheduledDate: null as Date | null
  });
  
  // Additional states for campaign creation
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch templates, campaigns, and statistics
        const [templatesData, campaignsData, statsData] = await Promise.all([
          emailTemplateService.getAllTemplates(),
          emailCampaignService.getAllCampaigns(),
          emailStatisticsService.getEmailStatistics()
        ]);
        
        setTemplates(templatesData);
        setCampaigns(campaignsData);
        setStatistics(statsData);
      } catch (error) {
        console.error("Error loading email data:", error);
        toast({
          title: "Error",
          description: "Failed to load email data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // Toggle template status
  const handleToggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    try {
      await emailTemplateService.toggleTemplateStatus(templateId, isActive);
      
      // Update local state
      setTemplates(templates.map(template => 
        template.id === templateId 
          ? { ...template, isActive } 
          : template
      ));
      
      toast({
        title: "Success",
        description: `Template ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error("Error toggling template status:", error);
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive"
      });
    }
  };
  
  // Edit template
  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      isActive: template.isActive
    });
    setIsTemplateDialogOpen(true);
  };
  
  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await emailTemplateService.deleteTemplate(templateId);
      
      // Update local state
      setTemplates(templates.filter(template => template.id !== templateId));
      
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };
  
  // Create or update template
  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.name || !templateForm.subject || !templateForm.body) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
      
      setLoading(true);
      
      if (selectedTemplate) {
        // Update existing template - updatedAt is handled by the service
        await emailTemplateService.updateTemplate(selectedTemplate.id, {
          name: templateForm.name,
          subject: templateForm.subject,
          body: templateForm.body,
          isActive: templateForm.isActive
        });
      } else {
        // Create new template - timestamps are handled by the service
        await emailTemplateService.createTemplate({
          name: templateForm.name,
          subject: templateForm.subject,
          body: templateForm.body,
          isActive: templateForm.isActive,
          createdBy: currentUser?.uid || ""
        });
      }
      
      // Refresh templates after update
      const updatedTemplates = await emailTemplateService.getAllTemplates();
      setTemplates(updatedTemplates);
      
      toast({
        title: "Success",
        description: selectedTemplate ? "Template updated successfully" : "Template created successfully"
      });
      
      // Reset form and close dialog
      setTemplateForm({
        name: "",
        subject: "",
        body: "",
        isActive: true
      });
      setSelectedTemplate(null);
      setIsTemplateDialogOpen(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Open new template dialog
  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      name: "",
      subject: "",
      body: "",
      isActive: true
    });
    setIsTemplateDialogOpen(true);
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    
    try {
      // Handle Firestore Timestamp or regular Date objects
      const date = typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function' 
        ? timestamp.toDate() 
        : new Date(timestamp);
      
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Edit campaign
  const handleEditCampaign = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      subject: campaign.subject,
      body: campaign.body,
      recipients: campaign.recipients,
      status: campaign.status,
      scheduledDate: null
    });
    setIsCampaignDialogOpen(true);
  };
  
  // New campaign
  const handleNewCampaign = () => {
    setSelectedCampaign(null);
    setCampaignForm({
      name: "",
      subject: "",
      body: "",
      recipients: [],
      status: "draft",
      scheduledDate: null
    });
    setSelectedTemplateId(null);
    setRecipientInput("");
    setIsCampaignDialogOpen(true);
  };
  
  // Create or update campaign
  const handleSaveCampaign = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!campaignForm.name.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter a campaign name",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (!campaignForm.subject.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter an email subject",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (!campaignForm.body.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter email content",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (!(campaignForm.recipients && campaignForm.recipients.length > 0)) {
        toast({
          title: "Missing information",
          description: "Please add at least one recipient",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (selectedCampaign) {
        // Update existing campaign
        await emailCampaignService.updateCampaign(selectedCampaign.id, {
          name: campaignForm.name,
          subject: campaignForm.subject,
          body: campaignForm.body,
          recipients: campaignForm.recipients,
          status: campaignForm.status
        });
      } else {
        // Create new campaign
        await emailCampaignService.createCampaign({
          name: campaignForm.name,
          subject: campaignForm.subject,
          body: campaignForm.body,
          recipients: campaignForm.recipients,
          status: "draft",
          createdBy: currentUser?.uid || ""
        });
      }
      
      // Refresh campaigns
      const updatedCampaigns = await emailCampaignService.getAllCampaigns();
      setCampaigns(updatedCampaigns);
      
      toast({
        title: "Success",
        description: selectedCampaign ? "Campaign updated successfully" : "Campaign created successfully"
      });
      
      // Reset form and close dialog
      setCampaignForm({
        name: "",
        subject: "",
        body: "",
        recipients: [],
        status: "draft",
        scheduledDate: null
      });
      setSelectedTemplateId(null);
      setRecipientInput("");
      setSelectedCampaign(null);
      setIsCampaignDialogOpen(false);
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Load template into campaign
  const handleLoadTemplate = async () => {
    if (!selectedTemplateId) return;
    
    try {
      const template = await emailTemplateService.getTemplateById(selectedTemplateId);
      if (template) {
        setCampaignForm({
          ...campaignForm,
          subject: template.subject,
          body: template.body
        });
        toast({
          title: "Template Loaded",
          description: `Template "${template.name}" has been loaded`
        });
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive"
      });
    }
  };
  
  // Add recipient to campaign
  const handleAddRecipient = () => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientInput)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (!campaignForm.recipients.includes(recipientInput)) {
      setCampaignForm({
        ...campaignForm,
        recipients: [...campaignForm.recipients, recipientInput]
      });
      setRecipientInput("");
    } else {
      toast({
        title: "Duplicate Email",
        description: "This email is already in the recipients list",
        variant: "destructive"
      });
    }
  };
  
  // Remove recipient from campaign
  const handleRemoveRecipient = (email: string) => {
    setCampaignForm({
      ...campaignForm,
      recipients: campaignForm.recipients.filter(r => r !== email)
    });
  };
  
  // Delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    
    try {
      await emailCampaignService.deleteCampaign(campaignId);
      
      // Update local state
      setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId));
      
      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  };
  
  // Send campaign
  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to send this campaign now? This will send emails to all recipients.")) return;
    
    // First check if Brevo is configured
    const { isBrevoConfigured } = await import('@/utils/emailUtils');
    if (!isBrevoConfigured()) {
      toast({
        title: "Error",
        description: "Brevo email service is not configured. Please configure it in the Email Settings page first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Get campaign details to verify before sending
      const campaign = await emailCampaignService.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }
      
      if (campaign.recipients.length === 0) {
        toast({
          title: "Error",
          description: "This campaign has no recipients. Please add recipients before sending.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (!campaign.subject || !campaign.body) {
        toast({
          title: "Error",
          description: "Campaign is missing subject or body content. Please complete the campaign before sending.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log(`Sending campaign "${campaign.name}" to ${campaign.recipients.length} recipients`);
      await emailCampaignService.sendCampaign(campaignId);
      
      // Refresh campaigns
      const updatedCampaigns = await emailCampaignService.getAllCampaigns();
      setCampaigns(updatedCampaigns);
      
      toast({
        title: "Success",
        description: `Campaign "${campaign.name}" is being sent to ${campaign.recipients.length} recipients.`,
      });
      
      // Also provide info about checking the results
      toast({
        title: "Email Delivery",
        description: "It may take a few minutes for all emails to be delivered. Please check the browser console for delivery status.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error sending campaign:", error);
      
      // Provide more detailed error message if available
      let errorMessage = "Failed to send campaign";
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Schedule campaign
  const handleScheduleCampaign = async (campaignId: string, date: Date) => {
    try {
      setLoading(true);
      await emailCampaignService.scheduleCampaign(campaignId, date);
      
      // Refresh campaigns
      const updatedCampaigns = await emailCampaignService.getAllCampaigns();
      setCampaigns(updatedCampaigns);
      
      toast({
        title: "Success",
        description: "Campaign scheduled successfully"
      });
    } catch (error) {
      console.error("Error scheduling campaign:", error);
      toast({
        title: "Error",
        description: "Failed to schedule campaign",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get status badge for campaign
  const getCampaignStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      sending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      sent: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200"
    };
    
    return (
      <Badge variant="outline" className={statusColors[status] || statusColors.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Inside the component, add this function
  const handleForceUpdateTracking = async (campaignId: string) => {
    try {
      setLoading(true);
      await manuallyUpdateOpenCount(campaignId, 1);
      
      // Refresh the campaigns
      const updatedCampaigns = await emailCampaignService.getAllCampaigns();
      setCampaigns(updatedCampaigns);
      
      // Also refresh statistics
      const stats = await calculateStatistics(updatedCampaigns, templates);
      setStatistics(stats);
      
      toast({
        title: "Success",
        description: "Manually updated tracking count"
      });
    } catch (error) {
      console.error("Error updating tracking count:", error);
      toast({
        title: "Error",
        description: "Failed to update tracking count",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add this function to the component
  const handleSendTestEmail = async (campaignId: string) => {
    try {
      setLoading(true);
      
      // You can replace this with a dialog to input email if you want
      const testEmail = prompt("Enter email address for test:", "");
      
      if (!testEmail) {
        setLoading(false);
        return;
      }
      
      const result = await sendTestEmailWithTracking(campaignId, testEmail);
      
      if (result) {
        toast({
          title: "Success",
          description: `Test email sent to ${testEmail}`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send test email",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Bulk Emailers</h1>
        </div>
      </div>
      
      <p className="text-muted-foreground">
        Configure and manage bulk email campaigns and templates
      </p>
      
      <Tabs defaultValue="email-templates" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="email-campaigns">Email Campaigns</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="email-templates">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium mb-1">
                {templates.length} Email Templates
              </h2>
              <p className="text-sm text-muted-foreground">
                Create and manage reusable email templates
              </p>
            </div>
            <Button onClick={handleNewTemplate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
          
          {templates.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email template to get started with bulk emails
              </p>
              <Button onClick={handleNewTemplate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Template Name</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Subject</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Last Edited</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {templates.map((template, index) => (
                    <tr key={template.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{template.name}</td>
                      <td className="py-3 px-4">{template.subject}</td>
                      <td className="py-3 px-4">{formatDate(template.updatedAt)}</td>
                      <td className="py-3 px-4">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => handleToggleTemplateStatus(template.id, checked)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? "Edit Email Template" : "Create Email Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-subject">Email Subject</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="e.g., Welcome to our platform"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-body">Email Content</Label>
                  <EmailEditor
                    value={templateForm.body}
                    onChange={(value) => setTemplateForm({ ...templateForm, body: value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-active"
                    checked={templateForm.isActive}
                    onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })}
                  />
                  <Label htmlFor="template-active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {selectedTemplate ? "Update Template" : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="email-campaigns">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium mb-1">
                {campaigns.length} Email Campaigns
              </h2>
              <p className="text-sm text-muted-foreground">
                Create and manage your email campaigns
              </p>
            </div>
            <Button onClick={handleNewCampaign} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </div>
          
          {campaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email campaign to start reaching your audience
              </p>
              <Button onClick={handleNewCampaign} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Campaign Name</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Recipients</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Analytics</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign, index) => (
                    <tr key={campaign.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{campaign.name}</td>
                      <td className="py-3 px-4">{campaign.recipients && campaign.recipients.length || 0}</td>
                      <td className="py-3 px-4">
                        {campaign.status === 'sent' && formatDate(campaign.sentDate)}
                        {campaign.status === 'scheduled' && formatDate(campaign.scheduledDate)}
                        {(campaign.status === 'draft' || campaign.status === 'failed') && '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getCampaignStatusBadge(campaign.status)}
                      </td>
                      <td className="py-3 px-4">
                        {campaign.status === 'sent' ? (
                          <div className="text-sm">
                            <div>Sent: {campaign.sentCount}</div>
                            <div>Opens: {campaign.openCount}</div>
                            <div>Rate: {campaign.sentCount ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : 0}%</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not available</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {campaign.status === 'draft' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSendCampaign(campaign.id)}
                                className="text-xs"
                              >
                                Send
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditCampaign(campaign)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedCampaign ? "Edit Email Campaign" : "Create Email Campaign"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="e.g., Monthly Newsletter"
                  />
                </div>
                
                {!selectedCampaign && (
                  <div className="space-y-2">
                    <Label>Use Template (Optional)</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedTemplateId || ""}
                        onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                      >
                        <option value="">Select a template</option>
                        {templates
                          .filter(template => template.isActive)
                          .map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))
                        }
                      </select>
                      <Button 
                        variant="outline" 
                        onClick={handleLoadTemplate}
                        disabled={!selectedTemplateId}
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="campaign-subject">Email Subject</Label>
                  <Input
                    id="campaign-subject"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                    placeholder="e.g., Your Monthly Update"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="campaign-body">Email Content</Label>
                  <EmailEditor
                    value={campaignForm.body}
                    onChange={(value) => setCampaignForm({ ...campaignForm, body: value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      placeholder="Enter email address"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleAddRecipient}
                    >
                      Add
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-2 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {campaignForm.recipients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center p-4">
                        No recipients added yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {campaignForm.recipients.map(email => (
                          <Badge key={email} variant="secondary" className="flex items-center gap-1">
                            {email}
                            <button 
                              className="ml-1 hover:bg-muted rounded-full"
                              onClick={() => handleRemoveRecipient(email)}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCampaign}>
                  {selectedCampaign ? "Update Campaign" : "Create Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="statistics">
          <div className="mb-6">
            <h2 className="text-xl font-medium mb-1">
              Email Statistics
            </h2>
            <p className="text-sm text-muted-foreground">
              Analytics and performance metrics for your email campaigns
            </p>
          </div>
          
          {statistics ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Total Templates</div>
                <div className="text-2xl font-semibold">{statistics.templates.total}</div>
                <div className="text-sm text-muted-foreground mt-2">{statistics.templates.active} active</div>
              </Card>
              
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Total Campaigns</div>
                <div className="text-2xl font-semibold">{statistics.campaigns.total}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {statistics.campaigns.sent} sent · {statistics.campaigns.scheduled} scheduled · {statistics.campaigns.draft} draft
                </div>
              </Card>
              
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Total Emails Sent</div>
                <div className="text-2xl font-semibold">{statistics.totalEmailsSent}</div>
              </Card>
              
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Open Rate</div>
                <div className="text-2xl font-semibold">{statistics.openRate}%</div>
                <div className="text-sm text-muted-foreground mt-2">{statistics.totalOpens} emails opened</div>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          )}
          
          <h3 className="text-lg font-medium mt-8 mb-4">Email Opens by Campaign</h3>
          
          {campaigns.filter(c => c.status === 'sent').length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Campaign</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Sent Date</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Emails Sent</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Emails Opened</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Open Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns
                    .filter(c => c.status === 'sent')
                    .sort((a, b) => {
                      // Sort by sent date (newest first)
                      if (!a.sentDate || !b.sentDate) return 0;
                      
                      // Safely convert both dates ensuring we handle Firestore Timestamp objects
                      const getDateTime = (timestamp: any): number => {
                        try {
                          if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
                            return timestamp.toDate().getTime();
                          } else {
                            return new Date(timestamp).getTime();
                          }
                        } catch (e) {
                          return 0;
                        }
                      };
                      
                      return getDateTime(b.sentDate) - getDateTime(a.sentDate);
                    })
                    .map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{campaign.name}</td>
                        <td className="py-3 px-4">{formatDate(campaign.sentDate)}</td>
                        <td className="py-3 px-4">{campaign.sentCount}</td>
                        <td className="py-3 px-4">{campaign.openCount}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{ 
                                  width: `${campaign.sentCount ? Math.min(100, (campaign.openCount / campaign.sentCount) * 100) : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span>{campaign.sentCount ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : 0}%</span>
                            
                            {/* Add this button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-2 text-xs"
                              onClick={() => handleForceUpdateTracking(campaign.id)}
                              disabled={loading}
                            >
                              Force Update
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No sent campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Send a campaign to start tracking opens and engagement
              </p>
            </Card>
          )}
          
          <div className="mt-8 p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">About Email Open Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Email opens are tracked using a small invisible pixel embedded in each email. 
              Some email clients may block images or tracking pixels, resulting in underreported open rates. 
              For the most accurate results, always use A/B testing and multiple metrics to measure campaign success.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
            <h3 className="text-sm font-medium mb-2">Debug Tools</h3>
            <p className="text-sm text-muted-foreground mb-2">
              These links can help test and debug the email tracking functionality:
            </p>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Test tracking pixel: </span>
                <a 
                  href="http://localhost:3002/test-tracking" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open test page
                </a>
              </div>
              <div className="text-sm">
                <span className="font-medium">Manually track campaign open: </span>
                {campaigns
                  .filter(c => c.status === 'sent')
                  .slice(0, 3)
                  .map(campaign => (
                    <a 
                      key={campaign.id}
                      href={`http://localhost:3002/admin/test-tracking/${campaign.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline mr-4"
                    >
                      {campaign.name.substring(0, 15)}...
                    </a>
                  ))}
              </div>
              <div className="text-sm">
                <span className="font-medium">Send test email: </span>
                {campaigns
                  .filter(c => c.status === 'sent')
                  .slice(0, 3)
                  .map(campaign => (
                    <Button 
                      key={campaign.id}
                      variant="outline" 
                      size="sm" 
                      className="mr-4 text-xs"
                      onClick={() => handleSendTestEmail(campaign.id)}
                      disabled={loading}
                    >
                      Test {campaign.name.substring(0, 10)}...
                    </Button>
                  ))}
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mt-8 mb-4">Recent Activity</h3>
          
          {campaigns.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Campaign</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{campaign.name}</td>
                      <td className="py-3 px-4">
                        {campaign.status === 'sent' && formatDate(campaign.sentDate)}
                        {campaign.status === 'scheduled' && formatDate(campaign.scheduledDate)}
                        {(campaign.status === 'draft' || campaign.status === 'failed') && formatDate(campaign.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {getCampaignStatusBadge(campaign.status)}
                      </td>
                      <td className="py-3 px-4">
                        {campaign.status === 'sent' ? (
                          <div className="flex gap-2 items-center">
                            <span>Opens: {campaign.openCount}/{campaign.sentCount}</span>
                            <span className="text-sm text-muted-foreground">
                              ({campaign.sentCount ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No campaign data yet</h3>
              <p className="text-muted-foreground mb-4">
                Create and send campaigns to see statistics
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkEmailersSettings;
