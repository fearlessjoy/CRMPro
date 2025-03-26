
import { SettingsPageTemplate } from "@/components/settings/SettingsPageTemplate";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";

const FormsSettings = () => {
  return (
    <SettingsPageTemplate
      title="Abroad Forms"
      description="Manage forms for abroad programs"
    >
      <div className="mb-8">
        <div className="bg-green-500 text-white p-4 rounded-md shadow-md w-96">
          <h2 className="text-3xl font-bold mb-1">5</h2>
          <div className="flex justify-between items-center">
            <p>Forms</p>
            <Button 
              variant="ghost" 
              className="text-white border border-white hover:bg-green-600"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-16">Sr No.</TableHead>
              <TableHead>Form Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Fields</TableHead>
              <TableHead className="w-32">Actions</TableHead>
              <TableHead className="w-32 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((id) => (
              <TableRow key={id}>
                <TableCell>{id}</TableCell>
                <TableCell>{`Form ${id}`}</TableCell>
                <TableCell>{`Description for form ${id}`}</TableCell>
                <TableCell>{Math.floor(Math.random() * 10) + 5}</TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                      Edit
                    </Button>
                    <Button size="sm" variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                      View
                    </Button>
                    <Button size="sm" variant="default" className="bg-red-500 hover:bg-red-600 text-xs">
                      Delete
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={id % 2 === 0} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="default" className="bg-blue-500 hover:bg-blue-600">
          Export Forms
        </Button>
      </div>
    </SettingsPageTemplate>
  );
};

export default FormsSettings;
