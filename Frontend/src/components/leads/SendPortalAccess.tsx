import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Lead } from "@/services/leadService";
import * as leadService from "@/services/leadService";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Mail, Undo2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateRandomCode } from "@/lib/utils";
import { isBrevoConfigured, sendCustomEmail } from "@/utils/emailUtils";

interface SendPortalAccessProps {
  lead: Lead;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const formSchema = z.object({
  portalCode: z.string().min(6, { message: "Portal code must be at least 6 characters" }),
  message: z.string().optional(),
});

export function SendPortalAccess({ lead, onSuccess, onCancel }: SendPortalAccessProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a random code if none exists
  const generatedCode = lead.portalCode || generateRandomCode(8);

  // Initialize form with existing portal code or generate a new one
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      portalCode: generatedCode,
      message: `Dear ${lead.name},\n\nWe are pleased to provide you with access to your personalized portal where you can track your application status and upload required documents.\n\nYour portal access code is: ${generatedCode}\n\nPlease visit our portal at [portal-url] and use this code along with your email address (${lead.email}) to log in.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nYour Team`,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if Brevo is configured
      if (!isBrevoConfigured()) {
        setError("Email service is not configured. Please configure Brevo email settings first.");
        setIsLoading(false);
        return;
      }
      
      // Save the portal code to the lead record
      const leadUpdate = {
        ...lead,
        portalCode: values.portalCode,
        portalAccessSent: true,
        portalAccessSentAt: new Date()
      };
      
      // Update the lead in the database
      await leadService.updateLead(lead.id, leadUpdate);
      
      // Generate portal URL with leadId
      const portalUrl = `${window.location.origin}/lead-portal/${lead.id}`;
      
      // Update message with actual portal URL
      const messageWithUrl = values.message.replace('[portal-url]', portalUrl);
      
      // Convert plain text to HTML with proper line breaks
      const htmlMessage = messageWithUrl
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '')
        .trim();
      
      // Create a nicely formatted HTML email
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f5f5f5; padding: 20px; border-bottom: 3px solid #007bff; }
              .content { padding: 20px; }
              .code { font-size: 18px; font-weight: bold; background-color: #f0f0f0; padding: 10px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; }
              .button { display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Portal Access Details</h2>
              </div>
              <div class="content">
                ${htmlMessage}
                <div class="code">
                  Your Portal Access Code: ${values.portalCode}
                </div>
                <a href="${portalUrl}" class="button">Access Your Portal</a>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Send email using the Brevo service
      const emailSent = await sendCustomEmail(
        [{ email: lead.email, name: lead.name }],
        "Your Portal Access Details",
        htmlContent,
        messageWithUrl, // Text version as fallback
        undefined, // No attachments
        `portal-access-${lead.id}` // Campaign ID for tracking
      );
      
      if (!emailSent) {
        throw new Error("Failed to send email");
      }
      
      console.log('Portal access email sent to:', lead.email);
      
      // Success state
      setSent(true);
      if (onSuccess) onSuccess();
      
    } catch (err) {
      console.error("Error sending portal access:", err);
      setError("Failed to send portal access. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(form.getValues().portalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = () => {
    const newCode = generateRandomCode(8);
    form.setValue("portalCode", newCode);
    form.setValue("message", form.getValues().message.replace(form.getValues().portalCode, newCode));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send Portal Access</CardTitle>
        <CardDescription>
          Send portal access details to {lead.name} ({lead.email})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-green-50 text-green-700 rounded-md">
              <Check className="h-5 w-5 mr-2" />
              <p>Portal access details sent successfully!</p>
            </div>
            
            <div className="border p-4 rounded-md">
              <h3 className="font-medium mb-2">Access Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Email:</div>
                <div>{lead.email}</div>
                <div className="text-muted-foreground">Portal Code:</div>
                <div>{form.getValues().portalCode}</div>
              </div>
            </div>
            
            <Button onClick={onCancel} variant="outline" className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="portalCode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Portal Access Code</FormLabel>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={regenerateCode}
                        className="h-8 px-2 text-xs"
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                    <div className="flex">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={handleCopyCode}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormDescription>
                      This code will be used by the lead to access the portal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Message</FormLabel>
                    <FormControl>
                      <Textarea rows={10} {...field} />
                    </FormControl>
                    <FormDescription>
                      Customize the message that will be sent to the lead
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
      </CardContent>
      
      {!sent && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isLoading ? "Sending..." : "Send Access Email"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 