import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Mock CRM fields - in a real app, these would come from your CRM schema
const CRM_FIELDS = [
  { id: 'firstName', label: 'First Name', type: 'text' },
  { id: 'lastName', label: 'Last Name', type: 'text' },
  { id: 'email', label: 'Email', type: 'email' },
  { id: 'phone', label: 'Phone', type: 'phone' },
  { id: 'company', label: 'Company', type: 'text' },
  { id: 'jobTitle', label: 'Job Title', type: 'text' },
  { id: 'leadSource', label: 'Lead Source', type: 'text' },
  { id: 'notes', label: 'Notes', type: 'textarea' }
];

interface FormFieldMappingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (mapping: Record<string, string>) => void;
  formFields: Array<{
    name: string;
    label: string;
    type: string;
  }>;
  platform: string;
}

export function FormFieldMappingModal({
  open,
  onClose,
  onSave,
  formFields,
  platform
}: FormFieldMappingModalProps) {
  const [activeTab, setActiveTab] = useState('mapping');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Generate a preview of how the lead will look in the CRM
  const generatePreview = () => {
    const preview: Record<string, string> = {};
    
    for (const [formField, crmField] of Object.entries(fieldMapping)) {
      const field = formFields.find(f => f.name === formField);
      if (field) {
        preview[crmField] = `[${field.label} value]`;
      }
    }
    
    return preview;
  };
  
  // Handle saving the field mapping
  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(fieldMapping);
      onClose();
    } catch (error) {
      console.error('Error saving field mapping:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Field Mapping</DialogTitle>
          <DialogDescription>
            Map fields from your {platform} lead form to your CRM fields.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mapping" className="space-y-4">
            <div className="grid gap-4">
              {formFields.map(field => (
                <div key={field.name} className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label>{field.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      Type: {field.type}
                    </p>
                  </div>
                  
                  <Select
                    value={fieldMapping[field.name] || ''}
                    onValueChange={value => setFieldMapping(prev => ({
                      ...prev,
                      [field.name]: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CRM field" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_FIELDS.map(crmField => (
                        <SelectItem key={crmField.id} value={crmField.id}>
                          {crmField.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {formFields.length === 0 && (
              <Alert>
                <AlertDescription>
                  No fields found in the lead form. Please make sure the form is properly configured.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="rounded-md border p-4">
              <h4 className="font-medium mb-2">Lead Preview in CRM</h4>
              <div className="grid gap-2">
                {Object.entries(generatePreview()).map(([field, value]) => (
                  <div key={field} className="grid grid-cols-2">
                    <span className="text-muted-foreground">
                      {CRM_FIELDS.find(f => f.id === field)?.label}:
                    </span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              
              {Object.keys(fieldMapping).length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No fields mapped yet. Map some fields to see how they will appear in your CRM.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || Object.keys(fieldMapping).length === 0}
          >
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 