import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, AlertCircle, CheckCircle2, Send, Clock } from 'lucide-react';
import { EmailCampaign, getCampaignById, sendCampaign } from '@/services/emailCampaignService';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { isBrevoConfigured } from '@/utils/emailUtils';

const EmailCampaignDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        const campaignData = await getCampaignById(campaignId);
        setCampaign(campaignData);
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch campaign details',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaign();
  }, [campaignId, toast]);
  
  const handleSendCampaign = async () => {
    if (!campaign) return;
    
    if (!isBrevoConfigured()) {
      toast({
        title: 'Error',
        description: 'Brevo email service is not configured. Please configure it in Email Settings.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to send this campaign to ${campaign.recipients.length} recipients?`)) {
      return;
    }
    
    setSending(true);
    
    try {
      await sendCampaign(campaign.id);
      
      // Refresh campaign data
      const updatedCampaign = await getCampaignById(campaign.id);
      setCampaign(updatedCampaign);
      
      toast({
        title: 'Success',
        description: 'Campaign sending started successfully',
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send campaign',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { color: string, icon: JSX.Element }> = {
      draft: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <span>Draft</span> },
      scheduled: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="h-3 w-3 mr-1" /> },
      sending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Send className="h-3 w-3 mr-1" /> },
      sent: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> }
    };
    
    const { color, icon } = statusColors[status] || statusColors.draft;
    
    return (
      <Badge variant="outline" className={`${color} flex items-center`}>
        {icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-[200px] w-full mt-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Campaign not found</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="mr-4">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground mt-1">
            Email Campaign Details
          </p>
        </div>
        
        <div className="ml-auto">
          {campaign.status === 'draft' ? (
            <Button onClick={handleSendCampaign} disabled={sending}>
              {sending ? 'Sending...' : 'Send Campaign'}
            </Button>
          ) : (
            getStatusBadge(campaign.status)
          )}
        </div>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Email Content</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusBadge(campaign.status)}
                </div>
                {campaign.status === 'scheduled' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Scheduled for: {formatDate(campaign.scheduledDate)}
                  </p>
                )}
                {campaign.status === 'sent' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Sent on: {formatDate(campaign.sentDate)}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaign.recipients.length}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Email addresses
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.status === 'sent' ? (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sent</span>
                      <span className="font-medium">{campaign.sentCount}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm">Opens</span>
                      <span className="font-medium">{campaign.openCount}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm">Open Rate</span>
                      <span className="font-medium">
                        {campaign.sentCount > 0 
                          ? `${((campaign.openCount / campaign.sentCount) * 100).toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Not available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                General information about this email campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd>{campaign.name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Subject</dt>
                  <dd>{campaign.subject}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                  <dd>{formatDate(campaign.createdAt)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                  <dd>{formatDate(campaign.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>
                Preview of the email content that will be sent to recipients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border p-4 rounded-md">
                <div className="text-lg font-medium mb-2">{campaign.subject}</div>
                <div 
                  className="prose max-w-none" 
                  dangerouslySetInnerHTML={{ __html: campaign.body }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>
                List of email addresses that will receive this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.recipients.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No recipients added to this campaign
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Email Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {campaign.recipients.map((email, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm">{email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>
                Technical details for troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Brevo Configuration</h3>
                  <div className="bg-muted p-3 rounded text-sm">
                    <p>Brevo configured: <span className={isBrevoConfigured() ? "text-green-600" : "text-red-600"}>{isBrevoConfigured() ? "Yes" : "No"}</span></p>
                    <p>Sender email: {localStorage.getItem('brevo_sender_email') || 'Not set'}</p>
                    <p>Sender name: {localStorage.getItem('brevo_sender_name') || 'Not set'}</p>
                    <p>API key: {localStorage.getItem('brevo_api_key') ? "Set" : "Not set"}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Campaign Status History</h3>
                  <div className="bg-muted p-3 rounded text-sm">
                    <p>Current status: {campaign.status}</p>
                    <p>Created: {formatDate(campaign.createdAt)}</p>
                    {campaign.scheduledDate && <p>Scheduled for: {formatDate(campaign.scheduledDate)}</p>}
                    {campaign.sentDate && <p>Sent at: {formatDate(campaign.sentDate)}</p>}
                    <p>Updated: {formatDate(campaign.updatedAt)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Campaign ID</h3>
                  <div className="bg-muted p-3 rounded text-sm font-mono">
                    {campaign.id}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Campaign Object</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(campaign, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailCampaignDetail; 