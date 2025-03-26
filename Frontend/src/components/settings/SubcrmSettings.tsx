import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface SubcrmSettingsProps {
  userName: string;
  onBack?: () => void;
}

export function SubcrmSettings({ userName, onBack }: SubcrmSettingsProps) {
  const [formState, setFormState] = useState({
    // Payouts
    payout: {
      payoutEnabled: false,
      showInvoices: false,
      myPayouts: "",
      otherPayouts: "",
    },
    
    // Tasks
    tasks: {
      taskHeadings: "",
      subcrmBoxes: "Nothing selected",
      selectSubcrmReports: "Sandra Biju, Amanda Mehta, Dinisha Davis, Uma Vinod",
      hideTaskSettings: "All SUBCRM status Active configured (Recommended for Internal Emp)",
      selectTags: "Show All Tags",
      preSelectedDashboard: "Nothing selected",
    },
    
    // Support
    support: {
      supportMessage: false,
      allowSubcrmToCreateTagsMasterData: false,
      allowSubcrmToCreateSubcrm: false,
      allowSubcrmToRemoveSubcrm: false,
      blockExport: false,
      blockSubcrmForward: false,
      authenticateUsingOTP: false,
      hideNumberFromLeadPage: false,
      enableMarketing: false,
      createDuplicateLeadsWhileForwarding: false,
      createDuplicateLeadsIfComingFrom: "All",
      salesTarget: "",
      allowSubCRMAccessFrom: "",
      allowSubCRMAccessTo: "",
      defaultTag: "None",
    },
    
    // College
    college: {
      recommendationsAnalysis: false,
      recommendationsHide: false,
      applicationsAnalysis: false,
      applicationsHide: false,
    },
    
    // Documents
    documents: {
      documents: "",
      documentsHide: false,
      sopRename: "",
      sopHide: false,
    },
    
    // Banking
    banking: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      branch: "",
      ifscCode: "",
      swiftCode: "",
      gstNumber: "",
      panNumber: "",
    },
  });

  const handleSwitchChange = (section: string, field: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: checked,
      },
    }));
  };

  const handleInputChange = (section: string, field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSelectChange = (section: string, field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            asChild
          >
            <Link to="/settings/user">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to user settings</span>
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abroad Subcrm Settings</h1>
          <p className="text-muted-foreground mt-1">Control panel</p>
        </div>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <div className="mb-4">
          <Label htmlFor="userName">Remya Menon</Label>
          <Input id="userName" value={userName} readOnly className="mt-1" />
        </div>

        <div className="border-b my-8"></div>

        {/* Payouts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">Payout Enabled</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="payoutEnabled" className="mr-2">No</Label>
              <Switch 
                id="payoutEnabled" 
                checked={formState.payout.payoutEnabled}
                onCheckedChange={(checked) => handleSwitchChange('payout', 'payoutEnabled', checked)}
              />
              <Label htmlFor="payoutEnabled">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Show Invoices</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="showInvoices" className="mr-2">No</Label>
              <Switch 
                id="showInvoices" 
                checked={formState.payout.showInvoices}
                onCheckedChange={(checked) => handleSwitchChange('payout', 'showInvoices', checked)}
              />
              <Label htmlFor="showInvoices">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">My Payouts</h3>
            <Input 
              value={formState.payout.myPayouts} 
              onChange={(e) => handleInputChange('payout', 'myPayouts', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Other Payouts</h3>
            <Input 
              value={formState.payout.otherPayouts} 
              onChange={(e) => handleInputChange('payout', 'otherPayouts', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Tasks Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">Tasks Headings</h3>
            <Textarea 
              value={formState.tasks.taskHeadings} 
              onChange={(e) => handleInputChange('tasks', 'taskHeadings', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Subcrm Boxes (Select Process for Remya Menon)</h3>
            <Select 
              value={formState.tasks.subcrmBoxes}
              onValueChange={(value) => handleSelectChange('tasks', 'subcrmBoxes', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nothing selected">Nothing selected</SelectItem>
                <SelectItem value="Process 1">Process 1</SelectItem>
                <SelectItem value="Process 2">Process 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Select Subcrm who reports to Remya Menon</h3>
            <Select 
              value={formState.tasks.selectSubcrmReports}
              onValueChange={(value) => handleSelectChange('tasks', 'selectSubcrmReports', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sandra Biju, Amanda Mehta, Dinisha Davis, Uma Vinod">Sandra Biju, Amanda Mehta, Dinisha Davis, Uma Vinod</SelectItem>
                <SelectItem value="Sandra Biju">Sandra Biju</SelectItem>
                <SelectItem value="Amanda Mehta">Amanda Mehta</SelectItem>
                <SelectItem value="Dinisha Davis">Dinisha Davis</SelectItem>
                <SelectItem value="Uma Vinod">Uma Vinod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Hide Task Settings</h3>
            <Select 
              value={formState.tasks.hideTaskSettings}
              onValueChange={(value) => handleSelectChange('tasks', 'hideTaskSettings', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select setting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All SUBCRM status Active configured (Recommended for Internal Emp)">All SUBCRM status Active configured (Recommended for Internal Emp)</SelectItem>
                <SelectItem value="Option 1">Option 1</SelectItem>
                <SelectItem value="Option 2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Select Tags for Remya Menon</h3>
            <Select 
              value={formState.tasks.selectTags}
              onValueChange={(value) => handleSelectChange('tasks', 'selectTags', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Show All Tags">Show All Tags</SelectItem>
                <SelectItem value="Tag 1">Tag 1</SelectItem>
                <SelectItem value="Tag 2">Tag 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Pre-selected Dashboard Filter for Remya Menon (Advanced)</h3>
            <Select 
              value={formState.tasks.preSelectedDashboard}
              onValueChange={(value) => handleSelectChange('tasks', 'preSelectedDashboard', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nothing selected">Nothing selected</SelectItem>
                <SelectItem value="Filter 1">Filter 1</SelectItem>
                <SelectItem value="Filter 2">Filter 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Support Message Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">Support Message</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="supportMessage" className="mr-2">No</Label>
              <Switch 
                id="supportMessage" 
                checked={formState.support.supportMessage}
                onCheckedChange={(checked) => handleSwitchChange('support', 'supportMessage', checked)}
              />
              <Label htmlFor="supportMessage">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Allow Subcrm to create Tags Master Data</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="allowSubcrmToCreateTagsMasterData" className="mr-2">No</Label>
              <Switch 
                id="allowSubcrmToCreateTagsMasterData" 
                checked={formState.support.allowSubcrmToCreateTagsMasterData}
                onCheckedChange={(checked) => handleSwitchChange('support', 'allowSubcrmToCreateTagsMasterData', checked)}
              />
              <Label htmlFor="allowSubcrmToCreateTagsMasterData">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Allow Subcrm to create Subcrm</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="allowSubcrmToCreateSubcrm" className="mr-2">No</Label>
              <Switch 
                id="allowSubcrmToCreateSubcrm" 
                checked={formState.support.allowSubcrmToCreateSubcrm}
                onCheckedChange={(checked) => handleSwitchChange('support', 'allowSubcrmToCreateSubcrm', checked)}
              />
              <Label htmlFor="allowSubcrmToCreateSubcrm">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Anyone can forward file to me</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="blockSubcrmForward" className="mr-2">No</Label>
              <Switch 
                id="blockSubcrmForward" 
                checked={!formState.support.blockSubcrmForward}
                onCheckedChange={(checked) => handleSwitchChange('support', 'blockSubcrmForward', !checked)}
              />
              <Label htmlFor="blockSubcrmForward">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Enable Marketing</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="enableMarketing" className="mr-2">No</Label>
              <Switch 
                id="enableMarketing" 
                checked={formState.support.enableMarketing}
                onCheckedChange={(checked) => handleSwitchChange('support', 'enableMarketing', checked)}
              />
              <Label htmlFor="enableMarketing">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Allow Subcrm to Remove Subcrm</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="allowSubcrmToRemoveSubcrm" className="mr-2">No</Label>
              <Switch 
                id="allowSubcrmToRemoveSubcrm" 
                checked={formState.support.allowSubcrmToRemoveSubcrm}
                onCheckedChange={(checked) => handleSwitchChange('support', 'allowSubcrmToRemoveSubcrm', checked)}
              />
              <Label htmlFor="allowSubcrmToRemoveSubcrm">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Block Export</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="blockExport" className="mr-2">No</Label>
              <Switch 
                id="blockExport" 
                checked={formState.support.blockExport}
                onCheckedChange={(checked) => handleSwitchChange('support', 'blockExport', checked)}
              />
              <Label htmlFor="blockExport">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Block Subcrm Forward</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="blockSubcrmForward2" className="mr-2">No</Label>
              <Switch 
                id="blockSubcrmForward2" 
                checked={formState.support.blockSubcrmForward}
                onCheckedChange={(checked) => handleSwitchChange('support', 'blockSubcrmForward', checked)}
              />
              <Label htmlFor="blockSubcrmForward2">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Create Duplicate Leads while Forwarding</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="createDuplicateLeadsWhileForwarding" className="mr-2">No</Label>
              <Switch 
                id="createDuplicateLeadsWhileForwarding" 
                checked={formState.support.createDuplicateLeadsWhileForwarding}
                onCheckedChange={(checked) => handleSwitchChange('support', 'createDuplicateLeadsWhileForwarding', checked)}
              />
              <Label htmlFor="createDuplicateLeadsWhileForwarding">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Authenticate while using OTP</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="authenticateUsingOTP" className="mr-2">No</Label>
              <Switch 
                id="authenticateUsingOTP" 
                checked={formState.support.authenticateUsingOTP}
                onCheckedChange={(checked) => handleSwitchChange('support', 'authenticateUsingOTP', checked)}
              />
              <Label htmlFor="authenticateUsingOTP">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Hide Number From Lead Page</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="hideNumberFromLeadPage" className="mr-2">No</Label>
              <Switch 
                id="hideNumberFromLeadPage" 
                checked={formState.support.hideNumberFromLeadPage}
                onCheckedChange={(checked) => handleSwitchChange('support', 'hideNumberFromLeadPage', checked)}
              />
              <Label htmlFor="hideNumberFromLeadPage">Yes</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">Create Duplicate Leads if coming from these subcrm's</h3>
            <Select 
              value={formState.support.createDuplicateLeadsIfComingFrom}
              onValueChange={(value) => handleSelectChange('support', 'createDuplicateLeadsIfComingFrom', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Some">Some</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Sales Target</h3>
            <Input 
              value={formState.support.salesTarget} 
              onChange={(e) => handleInputChange('support', 'salesTarget', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Allow SubCRM Access Timings (From)</h3>
            <Input 
              value={formState.support.allowSubCRMAccessFrom} 
              onChange={(e) => handleInputChange('support', 'allowSubCRMAccessFrom', e.target.value)}
              type="time"
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Allow SubCRM Access Timings (To)</h3>
            <Input 
              value={formState.support.allowSubCRMAccessTo} 
              onChange={(e) => handleInputChange('support', 'allowSubCRMAccessTo', e.target.value)}
              type="time"
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Default Tag (Lead came from Login Page)</h3>
            <Select 
              value={formState.support.defaultTag}
              onValueChange={(value) => handleSelectChange('support', 'defaultTag', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Tag 1">Tag 1</SelectItem>
                <SelectItem value="Tag 2">Tag 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* College Recommendations Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">College Recommendations Analysis</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="recommendationsAnalysis" className="mr-2">No</Label>
              <Switch 
                id="recommendationsAnalysis" 
                checked={formState.college.recommendationsAnalysis}
                onCheckedChange={(checked) => handleSwitchChange('college', 'recommendationsAnalysis', checked)}
              />
              <Label htmlFor="recommendationsAnalysis">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">College Recommendations Hide</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="recommendationsHide" className="mr-2">No</Label>
              <Switch 
                id="recommendationsHide" 
                checked={formState.college.recommendationsHide}
                onCheckedChange={(checked) => handleSwitchChange('college', 'recommendationsHide', checked)}
              />
              <Label htmlFor="recommendationsHide">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Documents</h3>
            <Input 
              value={formState.documents.documents} 
              onChange={(e) => handleInputChange('documents', 'documents', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Documents Hide</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="documentsHide" className="mr-2">No</Label>
              <Switch 
                id="documentsHide" 
                checked={formState.documents.documentsHide}
                onCheckedChange={(checked) => handleSwitchChange('documents', 'documentsHide', checked)}
              />
              <Label htmlFor="documentsHide">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">College Applications Analysis</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="applicationsAnalysis" className="mr-2">No</Label>
              <Switch 
                id="applicationsAnalysis" 
                checked={formState.college.applicationsAnalysis}
                onCheckedChange={(checked) => handleSwitchChange('college', 'applicationsAnalysis', checked)}
              />
              <Label htmlFor="applicationsAnalysis">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">College Applications Hide</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="applicationsHide" className="mr-2">No</Label>
              <Switch 
                id="applicationsHide" 
                checked={formState.college.applicationsHide}
                onCheckedChange={(checked) => handleSwitchChange('college', 'applicationsHide', checked)}
              />
              <Label htmlFor="applicationsHide">Yes</Label>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">SOP Rename</h3>
            <Input 
              value={formState.documents.sopRename} 
              onChange={(e) => handleInputChange('documents', 'sopRename', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">SOP Hide</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="sopHide" className="mr-2">No</Label>
              <Switch 
                id="sopHide" 
                checked={formState.documents.sopHide}
                onCheckedChange={(checked) => handleSwitchChange('documents', 'sopHide', checked)}
              />
              <Label htmlFor="sopHide">Yes</Label>
            </div>
          </div>
        </div>

        {/* Banking Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-md font-medium mb-2">Account Name:</h3>
            <Input 
              value={formState.banking.accountName} 
              onChange={(e) => handleInputChange('banking', 'accountName', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Account Number:</h3>
            <Input 
              value={formState.banking.accountNumber} 
              onChange={(e) => handleInputChange('banking', 'accountNumber', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Bank Name:</h3>
            <Input 
              value={formState.banking.bankName} 
              onChange={(e) => handleInputChange('banking', 'bankName', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Branch:</h3>
            <Input 
              value={formState.banking.branch} 
              onChange={(e) => handleInputChange('banking', 'branch', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">IFSC Code:</h3>
            <Input 
              value={formState.banking.ifscCode} 
              onChange={(e) => handleInputChange('banking', 'ifscCode', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Swift Code:</h3>
            <Input 
              value={formState.banking.swiftCode} 
              onChange={(e) => handleInputChange('banking', 'swiftCode', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">GST Number:</h3>
            <Input 
              value={formState.banking.gstNumber} 
              onChange={(e) => handleInputChange('banking', 'gstNumber', e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">PAN Number:</h3>
            <Input 
              value={formState.banking.panNumber} 
              onChange={(e) => handleInputChange('banking', 'panNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
} 