import { db } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Lead } from "./leadService";

interface EmailTemplate {
  subject: string;
  body: string;
}

// Collection reference
const EMAILS_COLLECTION = "emails";

// Send email functionality
export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  leadId: string
): Promise<void> => {
  try {
    // In a production app, this would connect to an email sending service
    // For now, we'll store the email in Firestore for demonstration
    await addDoc(collection(db, EMAILS_COLLECTION), {
      to,
      subject,
      body,
      leadId,
      status: "pending",
      createdAt: serverTimestamp()
    });
    
    console.log(`Email to ${to} queued for sending`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Send portal credentials email
export const sendPortalCredentialsEmail = async (lead: Lead, portalUrl: string): Promise<void> => {
  if (!lead.email) {
    throw new Error("Lead does not have an email address");
  }
  
  // Create the email template
  const template = getPortalCredentialsTemplate(lead, portalUrl);
  
  // Send the email
  await sendEmail(lead.email, template.subject, template.body, lead.id);
};

// Generate portal credentials email template
const getPortalCredentialsTemplate = (lead: Lead, portalUrl: string): EmailTemplate => {
  const loginLink = `${portalUrl}/lead-login`;
  
  const subject = "Your CRM Portal Access Details";
  
  const body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; }
    .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0; }
    .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Your CRM Portal</h1>
    </div>
    
    <div class="content">
      <p>Dear ${lead.name},</p>
      
      <p>We're pleased to provide you with access to your personal portal where you can track your application status, submit required documents, and stay updated on all developments.</p>
      
      <div class="credentials">
        <h3>Your Login Credentials</h3>
        <p><strong>Username:</strong> ${lead.email}</p>
        <p><strong>Password:</strong> ${lead.phone || 'Your phone number'}</p>
      </div>
      
      <p>For security reasons, we recommend changing your password after your first login.</p>
      
      <p>To access your portal, please click the button below:</p>
      
      <a href="${loginLink}" class="button">Access Your Portal</a>
      
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p>${loginLink}</p>
      
      <p>If you have any questions or need assistance, please don't hesitate to contact your account manager.</p>
      
      <p>Best regards,<br>Your CRM Team</p>
    </div>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return { subject, body };
};

// Check if email has been sent to a lead
export const hasEmailBeenSentToLead = async (leadId: string): Promise<boolean> => {
  // In a real app, this would check if an email has been sent to the lead
  // For now, we'll just return false to allow re-sending
  return false;
}; 