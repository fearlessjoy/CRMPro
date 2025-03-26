import axios from 'axios';

/**
 * Service for integrating with Brevo (formerly Sendinblue) email API
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  name: string;
  content: string; // Base64 encoded content
  contentType: string;
}

export interface EmailTemplate {
  id: number;
  params?: Record<string, any>;
}

export interface EmailOptions {
  sender: EmailRecipient;
  to: EmailRecipient[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: EmailRecipient;
  attachments?: EmailAttachment[];
  templateId?: number;
  params?: Record<string, any>;
  tags?: string[];
  headers?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  campaignId?: string; // Custom field to track specific campaign
}

class BrevoEmailService {
  private apiKey: string;
  private apiUrl = 'https://api.brevo.com/v3';
  
  constructor(apiKey: string = '') {
    // Default to environment variable if available, otherwise use provided key
    this.apiKey = apiKey || import.meta.env.VITE_BREVO_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Brevo API key is not set. Email functionality will not work.');
    }
  }

  /**
   * Set the API key for Brevo
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Send a transactional email
   */
  async sendEmail(options: EmailOptions): Promise<{messageId: string}> {
    try {
      if (!this.apiKey) {
        throw new Error('Brevo API key is not set');
      }

      // Always enable tracking for all emails by default
      const emailOptionsWithTracking = {
        ...options,
        // Force tracking to be enabled
        trackOpens: true,
        trackClicks: true
      };

      // Add custom headers for campaign tracking if campaignId is provided
      if (options.campaignId) {
        emailOptionsWithTracking.headers = {
          ...emailOptionsWithTracking.headers,
          'X-CRM-Campaign-ID': options.campaignId
        };
        
        // Adding tracking pixel for custom open tracking if we have HTML content
        if (emailOptionsWithTracking.htmlContent) {
          // First ensure the HTML has proper structure
          let htmlContent = emailOptionsWithTracking.htmlContent;
          
          if (!htmlContent.includes('<html')) {
            htmlContent = `<html><body>${htmlContent}</body></html>`;
          }
          
          // Add tracking pixel before the closing body tag or at the end of content if no body tag
          if (htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace(
              '</body>',
              `<img src="${window.location.origin}/api/track-email-open?campaignId=${options.campaignId}" 
                   alt="" width="1" height="1" style="display:none;" /></body>`
            );
          } else if (htmlContent.includes('</html>')) {
            htmlContent = htmlContent.replace(
              '</html>',
              `<img src="${window.location.origin}/api/track-email-open?campaignId=${options.campaignId}" 
                   alt="" width="1" height="1" style="display:none;" /></html>`
            );
          } else {
            // Just append it at the end
            htmlContent = `${htmlContent}<img src="${window.location.origin}/api/track-email-open?campaignId=${options.campaignId}" 
                                           alt="" width="1" height="1" style="display:none;" />`;
          }
          
          // Also add another tracking image with absolute backend URL to ensure it works
          // This handles the case where window.location.origin might not be the backend URL
          const backendUrl = 'http://localhost:3002'; // This should be configured in your environment
          const backendTrackingPixel = `<img src="${backendUrl}/api/track-email-open?campaignId=${options.campaignId}" 
                                            alt="" width="1" height="1" style="display:none;" />`;
                                            
          // Add the backend tracking pixel as well
          if (htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace('</body>', `${backendTrackingPixel}</body>`);
          } else if (htmlContent.includes('</html>')) {
            htmlContent = htmlContent.replace('</html>', `${backendTrackingPixel}</html>`);
          } else {
            htmlContent = `${htmlContent}${backendTrackingPixel}`;
          }
          
          emailOptionsWithTracking.htmlContent = htmlContent;
          
          // Log that we've added tracking pixels
          console.log(`Added tracking pixels for campaign ${options.campaignId}`);
        }
      }

      // For bulk emails, ensure we don't exceed recipient limits
      if (emailOptionsWithTracking.to && emailOptionsWithTracking.to.length > 50) {
        console.warn(`Brevo API: Large recipient list detected (${emailOptionsWithTracking.to.length}). Breaking into batches of 50.`);
        
        // Create batches of 50 recipients
        const batches = [];
        for (let i = 0; i < emailOptionsWithTracking.to.length; i += 50) {
          batches.push(emailOptionsWithTracking.to.slice(i, i + 50));
        }
        
        console.log(`Brevo API: Sending ${batches.length} batches for bulk email.`);
        
        // Send emails in batches
        const results = [];
        for (let i = 0; i < batches.length; i++) {
          const batchOptions = {
            ...emailOptionsWithTracking,
            to: batches[i]
          };
          
          console.log(`Brevo API: Sending batch ${i+1}/${batches.length} with ${batches[i].length} recipients`);
          
          try {
            const response = await axios.post(
              `${this.apiUrl}/smtp/email`,
              batchOptions,
              {
                headers: {
                  'accept': 'application/json',
                  'api-key': this.apiKey,
                  'content-type': 'application/json'
                }
              }
            );
            
            results.push(response.data.messageId);
            console.log(`Brevo API: Batch ${i+1} sent successfully with messageId: ${response.data.messageId}`);
          } catch (error) {
            console.error(`Brevo API: Error sending batch ${i+1}:`, error);
            if (axios.isAxiosError(error)) {
              console.error('Brevo API: Batch error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
              });
            }
          }
        }
        
        return { messageId: results.join(',') };
      }

      console.log('Sending email with Brevo API, options:', JSON.stringify({
        sender: emailOptionsWithTracking.sender,
        to: emailOptionsWithTracking.to,
        subject: emailOptionsWithTracking.subject,
        recipientCount: emailOptionsWithTracking.to.length,
        trackOpens: emailOptionsWithTracking.trackOpens,
        trackClicks: emailOptionsWithTracking.trackClicks,
        campaignId: emailOptionsWithTracking.campaignId
      }, null, 2));
      console.log('Using API key:', this.apiKey.substring(0, 5) + '...' + this.apiKey.substring(this.apiKey.length - 5));

      const response = await axios.post(
        `${this.apiUrl}/smtp/email`,
        emailOptionsWithTracking,
        {
          headers: {
            'accept': 'application/json',
            'api-key': this.apiKey,
            'content-type': 'application/json'
          }
        }
      );

      console.log('Brevo API response:', response.status, response.statusText);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      return { messageId: response.data.messageId };
    } catch (error) {
      console.error('Error sending email via Brevo:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      
      throw error;
    }
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(options: Omit<EmailOptions, 'htmlContent' | 'textContent'> & { templateId: number }): Promise<{messageId: string}> {
    try {
      return await this.sendEmail(options);
    } catch (error) {
      console.error('Error sending template email via Brevo:', error);
      throw error;
    }
  }

  /**
   * Get all email templates
   */
  async getTemplates(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/smtp/templates`,
        {
          headers: {
            'accept': 'application/json',
            'api-key': this.apiKey
          },
          params: {
            templateStatus: 'true'
          }
        }
      );
      
      return response.data.templates;
    } catch (error) {
      console.error('Error fetching email templates from Brevo:', error);
      throw error;
    }
  }

  /**
   * Get email events (opens, clicks, etc.)
   */
  async getEmailEvents(limit: number = 50, startDate?: string, endDate?: string, offset?: number): Promise<any> {
    try {
      const params: Record<string, any> = { limit };
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (offset !== undefined) params.offset = offset;
      
      const response = await axios.get(
        `${this.apiUrl}/smtp/statistics/events`,
        {
          headers: {
            'accept': 'application/json',
            'api-key': this.apiKey
          },
          params
        }
      );
      
      return response.data.events;
    } catch (error) {
      console.error('Error fetching email events from Brevo:', error);
      throw error;
    }
  }

  /**
   * Create a contact in Brevo
   */
  async createContact(email: string, attributes: Record<string, any> = {}, listIds: number[] = []): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/contacts`,
        {
          email,
          attributes,
          listIds
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': this.apiKey,
            'content-type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error creating contact in Brevo:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const brevoEmailService = new BrevoEmailService();
export default brevoEmailService; 