import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, AlertCircle, CheckCircle2, SendIcon, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import brevoEmailService, { EmailOptions, EmailRecipient } from "@/services/brevoEmailService";

// Form schema
const configSchema = z.object({
  apiKey: z.string().min(10, "API key must be at least 10 characters"),
  defaultSenderName: z.string().min(1, "Sender name is required"),
  defaultSenderEmail: z.string().email("Must be a valid email address"),
  replyToEmail: z.string().email("Must be a valid email address").optional(),
});

const testEmailSchema = z.object({
  recipientEmail: z.string().email("Must be a valid email address"),
  recipientName: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type ConfigFormValues = z.infer<typeof configSchema>;
type TestEmailFormValues = z.infer<typeof testEmailSchema>;

const BrevoSettings = () => {
  const { toast } = useToast();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState("config");

  // Config form
  const configForm = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      apiKey: "",
      defaultSenderName: "",
      defaultSenderEmail: "",
      replyToEmail: "",
    },
  });

  // Test email form
  const testEmailForm = useForm<TestEmailFormValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      recipientEmail: "",
      recipientName: "",
      subject: "Test Email from CRM Pro",
      message: "This is a test email sent from your CRM Pro application to verify Brevo integration.",
    },
  });

  // Load saved configuration
  useEffect(() => {
    const loadConfig = () => {
      const savedApiKey = localStorage.getItem("brevo_api_key");
      const savedSenderName = localStorage.getItem("brevo_sender_name");
      const savedSenderEmail = localStorage.getItem("brevo_sender_email");
      const savedReplyToEmail = localStorage.getItem("brevo_reply_to");

      if (savedApiKey) {
        configForm.setValue("apiKey", savedApiKey);
        brevoEmailService.setApiKey(savedApiKey);
      }
      
      if (savedSenderName) {
        configForm.setValue("defaultSenderName", savedSenderName);
      }
      
      if (savedSenderEmail) {
        configForm.setValue("defaultSenderEmail", savedSenderEmail);
      }
      
      if (savedReplyToEmail) {
        configForm.setValue("replyToEmail", savedReplyToEmail);
      }

      setIsConfigured(!!savedApiKey && !!savedSenderName && !!savedSenderEmail);
    };

    loadConfig();
  }, [configForm]);

  // Save configuration
  const onSaveConfig = (data: ConfigFormValues) => {
    localStorage.setItem("brevo_api_key", data.apiKey);
    localStorage.setItem("brevo_sender_name", data.defaultSenderName);
    localStorage.setItem("brevo_sender_email", data.defaultSenderEmail);
    
    if (data.replyToEmail) {
      localStorage.setItem("brevo_reply_to", data.replyToEmail);
    } else {
      localStorage.removeItem("brevo_reply_to");
    }

    brevoEmailService.setApiKey(data.apiKey);
    setIsConfigured(true);
    
    toast({
      title: "Configuration Saved",
      description: "Your Brevo email configuration has been saved successfully.",
    });
  };

  // Send test email
  const onSendTestEmail = async (data: TestEmailFormValues) => {
    try {
      setIsSendingTest(true);
      
      // Validate sender info
      if (!configForm.getValues("defaultSenderEmail")) {
        toast({
          variant: "destructive",
          title: "Missing Sender Email",
          description: "Please enter a default sender email address in the configuration tab.",
        });
        setIsSendingTest(false);
        return;
      }

      const sender: EmailRecipient = {
        name: configForm.getValues("defaultSenderName"),
        email: configForm.getValues("defaultSenderEmail")
      };
      
      const recipient: EmailRecipient = {
        name: data.recipientName || data.recipientEmail,
        email: data.recipientEmail
      };
      
      const replyTo = configForm.getValues("replyToEmail") 
        ? { email: configForm.getValues("replyToEmail") } 
        : undefined;
      
      const emailOptions: EmailOptions = {
        sender,
        to: [recipient],
        subject: data.subject,
        htmlContent: `<html><body><p>${data.message}</p><p>If you're seeing this email, your Brevo integration is working correctly!</p></body></html>`,
        textContent: `${data.message}\n\nIf you're seeing this email, your Brevo integration is working correctly!`,
        replyTo
      };
      
      console.log("Sending test email with options:", JSON.stringify(emailOptions, null, 2));
      
      const result = await brevoEmailService.sendEmail(emailOptions);
      
      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${data.recipientEmail} with messageId: ${result.messageId}`,
      });

      toast({
        variant: "default",
        title: "Important Notes",
        description: "If you don't receive the email, please check: 1) Spam folder, 2) Verify your Brevo account is active, 3) Check Brevo sending limits and domain verification status.",
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      
      let errorMessage = error.message || "An unknown error occurred";
      
      // Handle specific error codes from Brevo API
      if (error.response?.data?.code) {
        const errorCode = error.response.data.code;
        if (errorCode === 'unauthorized') {
          errorMessage = "Invalid API key. Please check your Brevo API key and try again.";
        } else if (errorCode === 'invalid_parameter') {
          errorMessage = "Invalid email parameters. Check sender and recipient email addresses.";
        } else if (errorCode === 'missing_parameter') {
          errorMessage = "Missing required parameters. Make sure all fields are filled correctly.";
        } else {
          errorMessage = `Brevo API error (${errorCode}): ${error.response.data.message || errorMessage}`;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Failed to Send Test Email",
        description: errorMessage,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link to="/settings" className="mr-4">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brevo Email Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure Brevo to send emails from your CRM
          </p>
        </div>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Configured</AlertTitle>
          <AlertDescription>
            You need to set up your Brevo API key before you can send emails. You can get your API key from your Brevo account settings.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="test" disabled={!isConfigured}>
            <SendIcon className="h-4 w-4 mr-2" />
            Test Email
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Brevo API Configuration</CardTitle>
              <CardDescription>
                Enter your Brevo API key and default sender information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onSaveConfig)} className="space-y-4">
                  <FormField
                    control={configForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brevo API Key*</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Enter your Brevo API key" />
                        </FormControl>
                        <FormDescription>
                          You can find your API key in your Brevo account under SMTP & API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="defaultSenderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Sender Name*</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your Company Name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="defaultSenderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Sender Email*</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="noreply@yourcompany.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={configForm.control}
                    name="replyToEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reply-To Email (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="support@yourcompany.com" />
                        </FormControl>
                        <FormDescription>
                          If different from sender email, replies will go to this address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">
                    Save Configuration
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Verify your Brevo configuration by sending a test email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...testEmailForm}>
                <form onSubmit={testEmailForm.handleSubmit(onSendTestEmail)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={testEmailForm.control}
                      name="recipientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Email*</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="recipient@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={testEmailForm.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Name (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Recipient Name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={testEmailForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={testEmailForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message*</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={5} 
                            placeholder="Type your message here" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isSendingTest}>
                    {isSendingTest ? "Sending..." : "Send Test Email"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrevoSettings; 