import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import * as emailTemplateService from "./emailTemplateService";
import * as emailCampaignService from "./emailCampaignService";
import { EmailCampaign } from "./emailCampaignService";
import { EmailTemplate } from "./emailTemplateService";

// Types
export interface EmailStatistics {
  templates: {
    total: number;
    active: number;
    inactive: number;
  };
  campaigns: {
    total: number;
    sent: number;
    scheduled: number;
    draft: number;
    failed: number;
  };
  totalEmailsSent: number;
  totalOpens: number;
  openRate: number;
}

/**
 * Get overall email statistics
 */
export const getEmailStatistics = async (): Promise<EmailStatistics> => {
  try {
    // Import the services to get the data
    const emailCampaignService = await import("./emailCampaignService");
    const emailTemplateService = await import("./emailTemplateService");
    
    // Fetch campaigns and templates
    const campaigns = await emailCampaignService.getAllCampaigns();
    const templates = await emailTemplateService.getAllTemplates();
    
    // Calculate and return statistics
    return calculateStatistics(campaigns, templates);
  } catch (error) {
    console.error("Error getting email statistics:", error);
    
    // Return empty statistics if there's an error
    return {
      templates: {
        total: 0,
        active: 0,
        inactive: 0
      },
      campaigns: {
        total: 0,
        sent: 0,
        scheduled: 0,
        draft: 0,
        failed: 0
      },
      totalEmailsSent: 0,
      totalOpens: 0,
      openRate: 0
    };
  }
};

/**
 * Calculate email statistics from campaigns and templates
 */
export const calculateStatistics = (
  campaigns: EmailCampaign[],
  templates: EmailTemplate[]
): EmailStatistics => {
  // Calculate template statistics
  const templatesTotal = templates.length;
  const templatesActive = templates.filter(t => t.isActive).length;
  const templatesInactive = templatesTotal - templatesActive;
  
  // Calculate campaign statistics
  const campaignsTotal = campaigns.length;
  const campaignsSent = campaigns.filter(c => c.status === 'sent').length;
  const campaignsScheduled = campaigns.filter(c => c.status === 'scheduled').length;
  const campaignsDraft = campaigns.filter(c => c.status === 'draft').length;
  const campaignsFailed = campaigns.filter(c => c.status === 'failed').length;
  
  // Calculate email sent and open statistics
  const totalEmailsSent = campaigns.reduce((total, campaign) => {
    return total + (campaign.sentCount || 0);
  }, 0);
  
  const totalOpens = campaigns.reduce((total, campaign) => {
    return total + (campaign.openCount || 0);
  }, 0);
  
  // Calculate open rate (protect against division by zero)
  const openRate = totalEmailsSent > 0
    ? Math.round((totalOpens / totalEmailsSent) * 100)
    : 0;
  
  return {
    templates: {
      total: templatesTotal,
      active: templatesActive,
      inactive: templatesInactive
    },
    campaigns: {
      total: campaignsTotal,
      sent: campaignsSent,
      scheduled: campaignsScheduled,
      draft: campaignsDraft,
      failed: campaignsFailed
    },
    totalEmailsSent,
    totalOpens,
    openRate
  };
}; 