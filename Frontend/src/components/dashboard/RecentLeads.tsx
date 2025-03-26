import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentLeads } from "@/services/dashboardService";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users } from "lucide-react";

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  createdAt: any; // Firestore timestamp
}

interface RecentLeadsProps {
  limit?: number;
  thisWeekOnly?: boolean;
  title?: string;
  description?: string;
}

export function RecentLeads({ 
  limit = 5, 
  thisWeekOnly = false,
  title = "Recent Leads",
  description = "Recently added or updated leads"
}: RecentLeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecentLeads = async () => {
      try {
        setLoading(true);
        const recentLeads = await getRecentLeads(limit, thisWeekOnly);
        setLeads(recentLeads);
      } catch (error) {
        console.error("Error fetching recent leads:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentLeads();
  }, [limit, thisWeekOnly]);
  
  // Get status badge color with vibrant colors
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return "bg-blue-500 hover:bg-blue-600";
      case 'converted':
        return "bg-green-500 hover:bg-green-600";
      case 'inactive':
        return "bg-gray-500 hover:bg-gray-600";
      case 'lost':
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };
  
  // Get avatar background color based on name
  const getAvatarColor = (name: string): string => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-amber-100 text-amber-700",
      "bg-rose-100 text-rose-700",
      "bg-indigo-100 text-indigo-700"
    ];
    
    // Simple hash function to pick a color
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  // Format relative time
  const getRelativeTime = (timestamp: any): string => {
    if (!timestamp) return "Unknown";
    
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Invalid date";
    }
  };
  
  return (
    <Card className="h-full overflow-hidden border border-border/40 hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-card">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <p className="text-muted-foreground">No leads found</p>
          </div>
        ) : (
          // Lead list
          <div className="space-y-4">
            {leads.map((lead) => {
              const fullName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
              const initials = lead.name ? 
                lead.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() :
                `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();
              const avatarColor = getAvatarColor(fullName || 'Unknown');
              
              return (
                <div key={lead.id} className="flex items-start justify-between group hover:bg-primary/5 p-2 rounded-md transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${avatarColor}`}>
                      {initials || 'U'}
                    </div>
                    
                    <div>
                      <Link 
                        to={`/leads/${lead.id}`} 
                        className="font-medium hover:underline text-primary"
                      >
                        {fullName || "Unnamed Lead"}
                      </Link>
                      
                      <div className="text-sm text-muted-foreground">
                        {lead.email || lead.phone || "No contact info"}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`${getStatusColor(lead.status || "")} text-white`}>
                          {lead.status || "Unknown"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(lead.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link to={`/leads/${lead.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
            
            <div className="pt-2">
              <Link to="/leads">
                <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  View all leads
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 