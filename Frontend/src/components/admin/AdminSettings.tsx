import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AdminSettings, getAdminSettings, updateAdminSettings } from '@/services/adminSettingsService';
import { Loader2, Upload } from 'lucide-react';

export function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAdminSettings();
      setSettings(data || { 
        companyName: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      if (data?.companyLogo) {
        setLogoPreview(data.companyLogo);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await updateAdminSettings(settings, logoFile || undefined);
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
      await loadSettings(); // Reload settings to get the new logo URL
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={settings?.companyName || ''}
              onChange={(e) => setSettings(prev => prev ? { ...prev, companyName: e.target.value } : null)}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative w-32 h-32">
                  <img
                    src={logoPreview}
                    alt="Company logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <Label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
                >
                  <Upload className="h-5 w-5" />
                  <span>Click to upload logo</span>
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <Input
              id="primaryColor"
              type="color"
              value={settings?.primaryColor || '#000000'}
              onChange={(e) => setSettings(prev => prev ? { ...prev, primaryColor: e.target.value } : null)}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 