import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead } from "@/services/leadService";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeadTableProps {
  leads: Lead[];
  onAddLead: () => void;
  onSelectLead: (lead: Lead) => void;
}

const LeadTable = ({ leads, onAddLead, onSelectLead }: LeadTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Lead>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Format date helper function
  const formatDate = (date: any): string => {
    if (!date) return "N/A";
    
    try {
      // Handle Firebase Timestamp
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      
      // Handle regular Date objects or ISO strings
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get status badge color
  const getStatusBadgeVariant = (status?: string): "default" | "outline" | "secondary" | "destructive" => {
    if (!status) return "outline";
    
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "converted":
        return "default";
      case "lost":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Handle sort function
  const handleSort = (column: keyof Lead) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sort and filter leads
  const filteredAndSortedLeads = leads
    .filter((lead) => {
      // Search in name, email, phone, and notes
      return (
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        (lead.notes && lead.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .sort((a, b) => {
      // Skip sort if the column doesn't exist on both items
      if (!a[sortColumn] || !b[sortColumn]) return 0;

      let valueA = a[sortColumn];
      let valueB = b[sortColumn];

      // Handle date comparisons
      if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
        const dateA = valueA && typeof valueA.toDate === 'function' ? valueA.toDate() : new Date(valueA || 0);
        const dateB = valueB && typeof valueB.toDate === 'function' ? valueB.toDate() : new Date(valueB || 0);
        
        return sortDirection === "asc" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }

      // Handle string comparisons
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={onAddLead}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Name
                {sortColumn === "name" && (
                  <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("status")}
              >
                Status
                {sortColumn === "status" && (
                  <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("createdAt")}
              >
                Created
                {sortColumn === "createdAt" && (
                  <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                      {lead.status || "New"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectLead(lead)}>
                          View Portal Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                        <DropdownMenuItem>Send Email</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete Lead
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeadTable; 