import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import * as leadService from "@/services/leadService";

// Define the form schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  portalCode: z.string().min(6, { message: "Portal code must be at least 6 characters" }),
});

const LeadLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      portalCode: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, this would validate against an API
      // For this example, we'll use the lead service to find a matching lead
      const allLeads = await leadService.getAllLeads();
      const matchingLead = allLeads.find(
        (lead) => lead.email.toLowerCase() === values.email.toLowerCase() && 
                 lead.portalCode === values.portalCode
      );
      
      if (matchingLead) {
        // Store lead ID in session storage
        sessionStorage.setItem('leadPortalId', matchingLead.id);
        
        // Redirect to lead portal
        navigate(`/lead-portal/${matchingLead.id}`);
      } else {
        setError("Invalid email or portal code. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-8 text-center">
          <h2 className="text-2xl font-bold">Lead Portal Login</h2>
          <p className="text-gray-500 mt-2">Enter your email and portal code to access your account</p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="yourname@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="portalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portal Code</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Your portal access code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Access Portal"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have a portal access code? Please contact your representative.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadLogin; 