import brevoEmailService, { EmailOptions, EmailRecipient } from "@/services/brevoEmailService";

/**
 * Utility functions for sending emails using Brevo email service
 */

/**
 * Get default sender information from localStorage
 */
const getDefaultSender = (): EmailRecipient => {
  const senderName = localStorage.getItem("brevo_sender_name") || "CRM Pro";
  const senderEmail = localStorage.getItem("brevo_sender_email") || "";
  
  return {
    name: senderName,
    email: senderEmail,
  };
};

/**
 * Get optional reply-to information from localStorage
 */
const getReplyTo = (): EmailRecipient | undefined => {
  const replyToEmail = localStorage.getItem("brevo_reply_to");
  return replyToEmail ? { email: replyToEmail } : undefined;
};

/**
 * Check if Brevo is configured
 */
export const isBrevoConfigured = (): boolean => {
  const apiKey = localStorage.getItem("brevo_api_key");
  const senderEmail = localStorage.getItem("brevo_sender_email");
  return !!apiKey && !!senderEmail;
};

/**
 * Send a welcome email to a new user
 */
export const sendWelcomeEmail = async (
  userEmail: string, 
  userName: string, 
  companyName: string = "CRM Pro"
): Promise<boolean> => {
  if (!isBrevoConfigured()) {
    console.warn("Brevo is not configured. Cannot send welcome email.");
    return false;
  }
  
  try {
    const emailOptions: EmailOptions = {
      sender: getDefaultSender(),
      to: [{ email: userEmail, name: userName }],
      subject: `Welcome to ${companyName}`,
      htmlContent: `
        <html>
          <body>
            <h2>Welcome to ${companyName}!</h2>
            <p>Hello ${userName},</p>
            <p>We're excited to have you on board. Your account has been created successfully.</p>
            <p>You can now log in to the CRM system to manage your customers, leads, and more.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The ${companyName} Team</p>
          </body>
        </html>
      `,
      replyTo: getReplyTo(),
    };
    
    await brevoEmailService.sendEmail(emailOptions);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
};

/**
 * Send a notification about a new lead
 */
export const sendLeadNotificationEmail = async (
  userEmail: string,
  userName: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string = "",
  leadSource: string = "",
  companyName: string = "CRM Pro"
): Promise<boolean> => {
  if (!isBrevoConfigured()) {
    console.warn("Brevo is not configured. Cannot send lead notification.");
    return false;
  }
  
  try {
    const emailOptions: EmailOptions = {
      sender: getDefaultSender(),
      to: [{ email: userEmail, name: userName }],
      subject: `New Lead Assigned: ${leadName}`,
      htmlContent: `
        <html>
          <body>
            <h2>New Lead Assigned</h2>
            <p>Hello ${userName},</p>
            <p>A new lead has been assigned to you in the CRM system:</p>
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
              <p><strong>Name:</strong> ${leadName}</p>
              <p><strong>Email:</strong> ${leadEmail}</p>
              ${leadPhone ? `<p><strong>Phone:</strong> ${leadPhone}</p>` : ''}
              ${leadSource ? `<p><strong>Source:</strong> ${leadSource}</p>` : ''}
            </div>
            <p>Please follow up with this lead as soon as possible.</p>
            <p>Best regards,<br>The ${companyName} Team</p>
          </body>
        </html>
      `,
      replyTo: getReplyTo(),
    };
    
    await brevoEmailService.sendEmail(emailOptions);
    return true;
  } catch (error) {
    console.error("Error sending lead notification email:", error);
    return false;
  }
};

/**
 * Send a task reminder email
 */
export const sendTaskReminderEmail = async (
  userEmail: string,
  userName: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: Date,
  taskPriority: string = "Normal",
  companyName: string = "CRM Pro"
): Promise<boolean> => {
  if (!isBrevoConfigured()) {
    console.warn("Brevo is not configured. Cannot send task reminder.");
    return false;
  }
  
  try {
    const formattedDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = dueDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let priorityColor = "#1E88E5"; // Blue for normal
    if (taskPriority.toLowerCase() === "high") {
      priorityColor = "#E53935"; // Red for high
    } else if (taskPriority.toLowerCase() === "low") {
      priorityColor = "#43A047"; // Green for low
    }
    
    const emailOptions: EmailOptions = {
      sender: getDefaultSender(),
      to: [{ email: userEmail, name: userName }],
      subject: `Task Reminder: ${taskTitle}`,
      htmlContent: `
        <html>
          <body>
            <h2>Task Reminder</h2>
            <p>Hello ${userName},</p>
            <p>This is a reminder about your upcoming task:</p>
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
              <h3 style="margin-top: 0;">${taskTitle}</h3>
              <p>${taskDescription}</p>
              <p><strong>Due:</strong> ${formattedDate} at ${formattedTime}</p>
              <p><strong>Priority:</strong> <span style="color: ${priorityColor};">${taskPriority}</span></p>
            </div>
            <p>Please make sure to complete this task on time.</p>
            <p>Best regards,<br>The ${companyName} Team</p>
          </body>
        </html>
      `,
      replyTo: getReplyTo(),
    };
    
    await brevoEmailService.sendEmail(emailOptions);
    return true;
  } catch (error) {
    console.error("Error sending task reminder email:", error);
    return false;
  }
};

/**
 * Add tracking pixels to HTML content
 */
export const addTrackingPixelsToHtml = (html: string, campaignId?: string): string => {
  if (!campaignId) {
    return html;
  }

  console.log(`Adding tracking pixels for campaign ${campaignId}`);
  
  // Create tracking pixel URLs - use both absolute and localhost URLs for redundancy
  const localTrackingUrl = `http://localhost:3002/api/track-email-open?campaignId=${campaignId}`;
  const backupTrackingUrl = `https://your-production-domain.com/api/track-email-open?campaignId=${campaignId}`; // Replace with your production URL when deployed
  
  // Additional tracking mechanisms
  // 1. Standard pixel
  const trackingPixel = `<img src="${localTrackingUrl}" width="1" height="1" alt="" style="display:none;">`;
  // 2. Background image fallback (some clients block img tags but load backgrounds)
  const backgroundTracking = `<div style="background-image:url('${localTrackingUrl}');background-repeat:no-repeat;background-position:-9999px -9999px;height:1px;width:1px;"></div>`;
  // 3. CSS-based tracking (even more fallbacks)
  const cssTracking = `<style>@media (max-width: 1px) { body::after { content: url('${localTrackingUrl}'); display: none; }}</style>`;
  
  // Create a set of all tracking elements
  const trackingElements = `
    <!-- Email tracking pixels -->
    ${trackingPixel}
    ${backgroundTracking}
    ${cssTracking}
    <!-- Additional tracking for redundancy -->
    <img src="${backupTrackingUrl}" width="1" height="1" alt="" style="display:none;">
  `;
  
  // Check if the HTML has proper structure
  if (html.includes('</body>')) {
    // If it has a body tag, insert before closing body tag
    return html.replace('</body>', `${trackingElements}</body>`);
  } else if (html.includes('</html>')) {
    // If it has HTML but no body, insert before closing html
    return html.replace('</html>', `${trackingElements}</html>`);
  } else {
    // Just append to the end if no proper HTML structure
    return `${html}${trackingElements}`;
  }
};

/**
 * Send a custom email
 */
export const sendCustomEmail = async (
  recipients: EmailRecipient[],
  subject: string,
  htmlContent: string,
  textContent?: string,
  attachments?: Array<{ name: string, content: string, contentType: string }>,
  campaignId?: string
): Promise<boolean> => {
  if (!isBrevoConfigured()) {
    console.warn("Brevo is not configured. Cannot send custom email.");
    return false;
  }
  
  if (recipients.length === 0) {
    console.warn("No recipients specified. Cannot send email.");
    return false;
  }
  
  try {
    console.log("sendCustomEmail: Preparing to send email to", recipients.length, "recipients");
    console.log("sendCustomEmail: First few recipients:", recipients.slice(0, 3));
    console.log("sendCustomEmail: Using campaignId:", campaignId || "NONE");
    
    // Verify sender configuration is correct
    const sender = getDefaultSender();
    console.log("sendCustomEmail: Using sender:", sender);
    
    if (!sender.email) {
      console.error("sendCustomEmail: Sender email is missing");
      return false;
    }
    
    // Enhanced HTML with tracking pixels
    const enhancedHtmlContent = addTrackingPixelsToHtml(htmlContent, campaignId);
    
    // Log the enhanced HTML if in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending email with tracking pixels:', 
        campaignId ? 'Using campaignId: ' + campaignId : 'No campaignId provided');
    }
    
    // Make sure we have a text version of the email
    const textVersion = textContent || enhancedHtmlContent.replace(/<[^>]*>?/gm, ''); // Strip HTML tags

    // Debug information for tracking
    console.log("sendCustomEmail: Tracking pixels added for campaign:", campaignId);
    
    const emailOptions: EmailOptions = {
      sender: sender,
      to: recipients,
      subject,
      htmlContent: enhancedHtmlContent,
      textContent: textVersion,
      replyTo: getReplyTo(),
      attachments,
      trackOpens: true, // Always enable tracking
      trackClicks: true,
      campaignId, // Pass the campaign ID for tracking
      // Add custom headers to ensure tracking works
      headers: {
        'X-Campaign-ID': campaignId || 'none',
        'X-Tracking-Enabled': 'true'
      }
    };
    
    console.log("sendCustomEmail: Sending email with options:", JSON.stringify({
      sender: emailOptions.sender,
      to: emailOptions.to.slice(0, 3), // Log only first 3 recipients to avoid huge logs
      subject: emailOptions.subject,
      recipientCount: recipients.length,
      campaignId: emailOptions.campaignId,
      trackOpens: emailOptions.trackOpens,
      trackClicks: emailOptions.trackClicks,
      headers: emailOptions.headers
    }, null, 2));
    
    const result = await brevoEmailService.sendEmail(emailOptions);
    console.log("sendCustomEmail: Email sent successfully with messageId:", result.messageId);
    return true;
  } catch (error) {
    console.error("Error sending custom email:", error);
    
    // Log more details about the error
    if (error.response) {
      console.error("sendCustomEmail: API error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return false;
  }
}; 