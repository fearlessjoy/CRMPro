import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Facebook, Instagram, Linkedin, Twitter, AlertCircle, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { initiateSocialMediaOAuth, handleOAuthCallback, getFacebookLeadForms, getFacebookLeads } from '@/services/socialMediaApiService';
import { getSocialMediaIntegrations, updateSocialMediaIntegration, addSocialMediaLeadForm } from '@/services/socialMediaService';
import { FormFieldMappingModal } from '@/components/social-media/FormFieldMappingModal';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Platform configuration
const PLATFORMS = {
  facebook: {
    icon: Facebook,
    name: "Facebook"
  },
  instagram: {
    icon: Instagram,
    name: "Instagram"
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn"
  },
  twitter: {
    icon: Twitter,
    name: "Twitter"
  }
} as const;

interface PlatformConnection {
  platform: keyof typeof PLATFORMS;
  status: 'Connected' | 'Disconnected';
  lastSync: string;
  totalLeads: number;
}

const MOCK_CONNECTIONS: PlatformConnection[] = [
  { platform: 'facebook', status: 'Connected', lastSync: '2023-10-15', totalLeads: 156 },
  { platform: 'instagram', status: 'Disconnected', lastSync: 'Never', totalLeads: 0 },
  { platform: 'linkedin', status: 'Connected', lastSync: '2023-10-12', totalLeads: 78 },
  { platform: 'twitter', status: 'Disconnected', lastSync: 'Never', totalLeads: 0 }
];

export default function SocialMediaIntegration() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [leadForms, setLeadForms] = useState<Record<string, any[]>>({});
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [connections, setConnections] = useState<PlatformConnection[]>(MOCK_CONNECTIONS);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORMS | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [importSettings, setImportSettings] = useState({
    importComments: false,
    importMessages: false,
    autoSync: false,
    syncInterval: 'daily'
  });

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, []);
  
  // Handle OAuth callback if present
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      handleCallback();
    }
  }, [searchParams]);
  
  // Load integrations from the database
  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getSocialMediaIntegrations();
      setIntegrations(data);
      
      // Load lead forms for each Facebook integration
      const forms: Record<string, any[]> = {};
      for (const integration of data) {
        if (integration.platform === 'facebook') {
          forms[integration.pageId] = await getFacebookLeadForms(integration.pageId, integration.accessToken);
        }
      }
      setLeadForms(forms);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load social media integrations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle OAuth callback
  const handleCallback = async () => {
    try {
      const success = await handleOAuthCallback(searchParams);
      if (success) {
        toast({
          title: 'Success',
          description: 'Social media account connected successfully',
          variant: 'default'
        });
        await loadIntegrations();
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect social media account',
        variant: 'destructive'
      });
    }
  };
  
  // Connect to a social media platform
  const handleConnect = (platform: keyof typeof PLATFORMS) => {
    setSelectedPlatform(platform);
    setShowConnectForm(true);
  };

  const handleSubmitConnection = async () => {
    if (!selectedPlatform) {
      toast({
        title: 'Error',
        description: 'Please select a platform to connect',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      // Initiate the OAuth flow for the selected platform
      await initiateSocialMediaOAuth(selectedPlatform);
      
      // The page will redirect to the OAuth provider
      // When it returns, the useEffect with searchParams will handle the callback
      
    } catch (error) {
      console.error('Error connecting platform:', error);
      toast({
        title: 'Error',
        description: `Failed to connect to ${PLATFORMS[selectedPlatform].name}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setShowConnectForm(false);
      setSelectedPlatform(null);
      setApiKey('');
      setApiSecret('');
    }
  };

  const handleToggleConnection = (platform: keyof typeof PLATFORMS) => {
    setConnections(prev => prev.map(conn => 
      conn.platform === platform
        ? { ...conn, status: conn.status === 'Connected' ? 'Disconnected' : 'Connected' }
        : conn
    ));
  };
  
  // Handle form selection for field mapping
  const handleFormSelect = async (integration: any, form: any) => {
    setSelectedIntegration(integration);
    setSelectedForm(form);
    setShowMappingModal(true);
  };
  
  // Save field mapping
  const handleSaveMapping = async (mapping: any) => {
    try {
      await addSocialMediaLeadForm({
        platform: selectedIntegration.platform,
        integrationId: selectedIntegration.id,
        pageId: selectedIntegration.pageId,
        pageName: selectedIntegration.pageName,
        formId: selectedForm.id,
        formName: selectedForm.name,
        fieldMapping: mapping,
        status: 'active',
        lastUpdated: new Date(),
        createdAt: new Date(),
        leadsReceived: 0
      });
      
      toast({
        title: 'Success',
        description: 'Lead form mapping saved successfully',
        variant: 'default'
      });
      
      setShowMappingModal(false);
      await loadIntegrations();
    } catch (error) {
      console.error('Error saving field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to save lead form mapping',
        variant: 'destructive'
      });
    }
  };

  const connectedCount = connections.filter(c => c.status === 'Connected').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Social Media Integration</h1>
          <p className="text-gray-500">Connect and import leads from social media platforms</p>
        </div>
      </div>

      {/* Connected Platforms Card */}
      <Card className="p-6 bg-[#6366F1]">
        <div className="flex justify-between items-center text-white">
          <div>
            <div className="text-4xl font-bold">{connectedCount}</div>
            <div className="mt-1">Connected Platforms</div>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white text-[#6366F1] hover:bg-gray-100"
            onClick={() => setShowConnectForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect New
          </Button>
        </div>
      </Card>

      {/* Platform Connections Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Platform Connections</h2>
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-gray-500">Sr. No.</th>
                <th className="text-left p-4 font-medium text-gray-500">Platform</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Last Sync</th>
                <th className="text-left p-4 font-medium text-gray-500">Total Leads</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                <th className="text-right p-4 font-medium text-gray-500">Connection</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection, index) => (
                <tr key={connection.platform} className="border-b last:border-0">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {React.createElement(PLATFORMS[connection.platform].icon, {
                        className: "w-6 h-6"
                      })}
                      {PLATFORMS[connection.platform].name}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                      connection.status === 'Connected' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {connection.status}
                    </span>
                  </td>
                  <td className="p-4">{connection.lastSync}</td>
                  <td className="p-4">{connection.totalLeads}</td>
                  <td className="p-4">
                    {connection.status === 'Connected' && (
                      <Button variant="secondary" size="sm">
                        Import Leads
                      </Button>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Switch
                      checked={connection.status === 'Connected'}
                      onCheckedChange={() => handleToggleConnection(connection.platform)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Platform Form */}
      {showConnectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Connect to Social Media Platform</h2>
            
            <div className="space-y-4">
              {/* Platform Selection */}
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(PLATFORMS).map(([key, platform]) => (
                  <button
                    key={key}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 ${
                      selectedPlatform === key ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPlatform(key as keyof typeof PLATFORMS)}
                  >
                    {React.createElement(platform.icon, {
                      className: "w-8 h-8"
                    })}
                    <span className="text-sm">{platform.name}</span>
                  </button>
                ))}
              </div>

              {/* API Credentials */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter API secret"
                  />
                </div>
              </div>

              {/* Import Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Import Settings</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="importComments">Import comments as notes</Label>
                  <Switch
                    id="importComments"
                    checked={importSettings.importComments}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, importComments: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="importMessages">Import messages</Label>
                  <Switch
                    id="importMessages"
                    checked={importSettings.importMessages}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, importMessages: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoSync">Auto-sync leads</Label>
                  <Switch
                    id="autoSync"
                    checked={importSettings.autoSync}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, autoSync: checked }))
                    }
                  />
                </div>

                {importSettings.autoSync && (
                  <div>
                    <Label htmlFor="syncInterval">Sync Interval</Label>
                    <Select
                      value={importSettings.syncInterval}
                      onValueChange={(value) => 
                        setImportSettings(prev => ({ ...prev, syncInterval: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowConnectForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitConnection}>
                  Connect Platform
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Mapping Modal */}
      {showMappingModal && selectedForm && (
        <FormFieldMappingModal
          open={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          onSave={handleSaveMapping}
          formFields={selectedForm.form_elements}
          platform={selectedIntegration.platform}
        />
      )}
    </div>
  );
} 