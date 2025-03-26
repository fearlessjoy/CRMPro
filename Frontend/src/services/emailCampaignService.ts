import { db } from "@/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

// Types
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipients: string[]; // Array of lead IDs or email addresses
  sentCount: number;
  openCount: number;
  scheduledDate?: Timestamp;
  sentDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Collection reference
const CAMPAIGNS_COLLECTION = "emailCampaigns";

// Get all email campaigns
export const getAllCampaigns = async (): Promise<EmailCampaign[]> => {
  try {
    const q = query(
      collection(db, CAMPAIGNS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EmailCampaign[];
  } catch (error) {
    console.error("Error getting email campaigns:", error);
    throw error;
  }
};

// Get campaign by ID
export const getCampaignById = async (campaignId: string): Promise<EmailCampaign | null> => {
  try {
    const campaignDoc = await getDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId));
    
    if (campaignDoc.exists()) {
      return { id: campaignDoc.id, ...campaignDoc.data() } as EmailCampaign;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting email campaign:", error);
    throw error;
  }
};

// Create a new campaign
export const createCampaign = async (campaignData: Omit<EmailCampaign, 'id' | 'createdAt' | 'updatedAt' | 'sentCount' | 'openCount'>): Promise<EmailCampaign> => {
  try {
    const newCampaignRef = doc(collection(db, CAMPAIGNS_COLLECTION));
    
    const newCampaign = {
      ...campaignData,
      sentCount: 0,
      openCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(newCampaignRef, newCampaign);
    
    // Get the campaign with the newly created ID
    const createdCampaignDoc = await getDoc(newCampaignRef);
    
    return { id: createdCampaignDoc.id, ...createdCampaignDoc.data() } as EmailCampaign;
  } catch (error) {
    console.error("Error creating email campaign:", error);
    throw error;
  }
};

// Update campaign
export const updateCampaign = async (campaignId: string, campaignData: Partial<EmailCampaign>): Promise<void> => {
  try {
    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
      ...campaignData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating email campaign:", error);
    throw error;
  }
};

// Delete campaign
export const deleteCampaign = async (campaignId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId));
  } catch (error) {
    console.error("Error deleting email campaign:", error);
    throw error;
  }
};

// Send campaign (in a real app, this would trigger a background job)
export const sendCampaign = async (campaignId: string): Promise<void> => {
  try {
    // Get the campaign details
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Update status to sending
    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
      status: 'sending',
      updatedAt: serverTimestamp()
    });
    
    try {
      // Import brevoEmailService and emailUtils
      const brevoEmailService = (await import('@/services/brevoEmailService')).default;
      const { isBrevoConfigured, sendCustomEmail } = await import('@/utils/emailUtils');
      
      // Check if Brevo is configured
      if (!isBrevoConfigured()) {
        throw new Error("Brevo email service is not configured");
      }

      console.log(`[DEBUG] Preparing to send campaign ${campaignId} to ${campaign.recipients.length} recipients`);
      
      // Convert recipients to proper format for Brevo
      const recipients = campaign.recipients.map(email => ({
        email: email,
        name: email.split('@')[0] // Simple name extraction from email
      }));
      
      // Prepare email HTML with tracking pixels
      const enhancedHtml = addTrackingToHtml(campaign.body, campaignId);
      console.log(`[DEBUG] Enhanced email with tracking pixels for campaign ${campaignId}`);
      
      // IMPORTANT: Enable tracking at database level before sending
      // This ensures we're tracking the campaign properly
      await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
        trackingEnabled: true,
        openCount: 0 // Reset open count when sending
      });
      console.log(`[DEBUG] Set tracking flags in database for campaign ${campaignId}`);
      
      // Use the sendCustomEmail function to send bulk email
      const result = await sendCustomEmail(
        recipients,
        campaign.subject,
        enhancedHtml, 
        undefined, // text content
        undefined, // attachments
        campaignId // Pass campaignId for tracking
      );
      
      if (!result) {
        throw new Error("Failed to send campaign emails");
      }
      
      // Update campaign status to sent
      await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
        status: 'sent',
        sentDate: Timestamp.now(),
        sentCount: campaign.recipients.length,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Campaign ${campaignId} sent successfully to ${campaign.recipients.length} recipients`);
    } catch (error) {
      console.error("Error sending campaign emails:", error);
      
      // Update campaign status to failed
      await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
        status: 'failed',
        updatedAt: serverTimestamp()
      });
      
      throw error;
    }
  } catch (error) {
    console.error("Error sending campaign:", error);
    throw error;
  }
};

// Helper function to add tracking pixels to HTML content
const addTrackingToHtml = (html: string, campaignId: string): string => {
  // Create tracking pixel with relative URL (uses origin from browser)
  const originTrackingPixel = `<img src="${window.location.origin}/api/track-email-open?campaignId=${campaignId}" alt="" width="1" height="1" style="display:none;" />`;
  
  // Create tracking pixel with absolute backend URL as a fallback
  // IMPORTANT: This needs to point to your actual backend server running on port 3002
  const backendUrl = 'http://localhost:3002';
  const backendTrackingPixel = `<img src="${backendUrl}/api/track-email-open?campaignId=${campaignId}" alt="" width="1" height="1" style="display:none;" />`;
  
  // Combined tracking pixels for redundancy
  const trackingPixels = originTrackingPixel + backendTrackingPixel;
  
  // Ensure the HTML has a proper structure
  let enhancedHtml = html;
  
  // If the HTML doesn't include basic HTML structure, add it
  if (!enhancedHtml.includes('<html')) {
    enhancedHtml = `<html><body>${enhancedHtml}</body></html>`;
  }
  
  console.log(`[DEBUG] Adding tracking pixels to email for campaign ${campaignId}`);
  
  // Insert tracking pixels at the appropriate location
  if (enhancedHtml.includes('</body>')) {
    // Insert tracking pixels right before the closing body tag
    return enhancedHtml.replace('</body>', `${trackingPixels}</body>`);
  } else if (enhancedHtml.includes('</html>')) {
    // Insert tracking pixels right before the closing html tag
    return enhancedHtml.replace('</html>', `${trackingPixels}</html>`);
  } else {
    // Just append tracking pixels at the end
    return `${enhancedHtml}${trackingPixels}`;
  }
};

// Schedule campaign
export const scheduleCampaign = async (campaignId: string, scheduledDate: Date): Promise<void> => {
  try {
    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
      status: 'scheduled',
      scheduledDate: Timestamp.fromDate(scheduledDate),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error scheduling campaign:", error);
    throw error;
  }
};

// Get campaign statistics
export const getCampaignStatistics = async (): Promise<{
  total: number;
  sent: number;
  scheduled: number;
  draft: number;
}> => {
  try {
    const campaigns = await getAllCampaigns();
    
    return {
      total: campaigns.length,
      sent: campaigns.filter(c => c.status === 'sent').length,
      scheduled: campaigns.filter(c => c.status === 'scheduled').length,
      draft: campaigns.filter(c => c.status === 'draft').length
    };
  } catch (error) {
    console.error("Error getting campaign statistics:", error);
    throw error;
  }
};

// Track email open for a campaign
export const trackEmailOpen = async (campaignId: string): Promise<void> => {
  try {
    // Get current campaign data to update the open count
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    // Increment the open count
    const newOpenCount = (campaign.openCount || 0) + 1;
    
    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, campaignId), {
      openCount: newOpenCount,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Tracked open for campaign ${campaignId}. New open count: ${newOpenCount}`);
  } catch (error) {
    console.error("Error tracking email open:", error);
    throw error;
  }
};

// Get tracking pixel HTML for a campaign
export const getTrackingPixelHtml = (campaignId: string): string => {
  // Create a URL to your tracking endpoint
  const trackingUrl = `${window.location.origin}/api/track-email-open?campaignId=${campaignId}`;
  
  // Return an invisible 1x1 pixel image that loads from that URL
  return `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none;" />`;
};

/**
 * Manually update the open count for a campaign (for debugging)
 */
export const manuallyUpdateOpenCount = async (campaignId: string, incrementBy: number = 1): Promise<boolean> => {
  try {
    console.log(`Manually updating open count for campaign ${campaignId} by ${incrementBy}`);
    
    // Hardcode the backend URL - adjust if your backend is on a different port
    const backendUrl = 'http://localhost:3002';
    const response = await fetch(`${backendUrl}/admin/test-tracking/${campaignId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error manually updating open count:', errorData);
      return false;
    }
    
    const data = await response.json();
    console.log('Manual update response:', data);
    
    return true;
  } catch (error) {
    console.error('Error manually updating open count:', error);
    return false;
  }
};

/**
 * Send a test email with tracking for debugging purposes
 */
export const sendTestEmailWithTracking = async (campaignId: string, recipient: string): Promise<boolean> => {
  try {
    // Import the necessary services
    const { sendCustomEmail } = await import("@/utils/emailUtils");
    const brevoEmailService = await import("@/services/brevoEmailService");
    
    console.log(`Sending test email with tracking for campaign ${campaignId} to ${recipient}`);
    
    // Create a simple HTML email with multiple tracking methods
    const backendUrl = 'http://localhost:3002';
    const trackingUrl = `${backendUrl}/api/track-email-open?campaignId=${campaignId}`;
    
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f5f5f5; padding: 10px; text-align: center; }
            .content { padding: 20px 0; }
            .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
            @media (max-width: 1px) { body::after { content: url('${trackingUrl}'); display: none; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Email Tracking Test</h2>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>This is a test email to verify that email tracking is working correctly in your CRM system.</p>
              <p>When you open this email, it should register as an "open" in your campaign statistics.</p>
              <p>If you're seeing this email but the open count isn't increasing, please check the following:</p>
              <ul>
                <li>Verify that your backend server is running</li>
                <li>Make sure your email client allows images to load</li>
                <li>Check the backend server logs for any errors</li>
              </ul>
              <p>Campaign ID being tracked: <strong>${campaignId}</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated test email from your CRM system.</p>
            </div>
          </div>
          
          <!-- Multiple tracking methods for redundancy -->
          <img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;">
          <div style="background-image:url('${trackingUrl}');height:1px;width:1px;position:absolute;"></div>
        </body>
      </html>
    `;
    
    // Send the email
    const result = await sendCustomEmail(
      [{ email: recipient, name: "Test Recipient" }],
      "CRM Email Tracking Test",
      htmlContent,
      undefined,
      undefined,
      campaignId
    );
    
    if (result) {
      console.log(`Test email sent successfully to ${recipient}`);
      return true;
    } else {
      console.error(`Failed to send test email to ${recipient}`);
      return false;
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return false;
  }
}; 