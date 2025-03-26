import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadTimeline } from "@/services/dashboardService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText, MessageSquare, ArrowRight, Calendar, Mail, Globe } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  timestamp: any;
  relativeTime: string;
  data: any;
}

// Event type configurations
const eventConfig: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
}> = {
  lead_created: {
    icon: <User className="h-4 w-4" />,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    label: "New Lead"
  },
  task_created: {
    icon: <FileText className="h-4 w-4" />,
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    label: "New Task"
  },
  message_sent: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: "bg-violet-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    label: "Message"
  },
  meeting_scheduled: {
    icon: <Calendar className="h-4 w-4" />,
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    label: "Meeting"
  }
};

const defaultEventConfig = {
  icon: <ArrowRight className="h-4 w-4" />,
  color: "bg-gray-500",
  bgColor: "bg-gray-50",
  textColor: "text-gray-700",
  label: "Activity"
};

export function LeadTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const timelineEvents = await getLeadTimeline(7); // Get 7 most recent events
        setEvents(timelineEvents);
      } catch (error) {
        console.error("Error fetching timeline events:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeline();
  }, []);
  
  // Get event configuration
  const getEventConfig = (type: string) => {
    return eventConfig[type] || defaultEventConfig;
  };
  
  return (
    <Card className="h-full overflow-hidden border border-border/40 hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-card">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Lead Timeline
        </CardTitle>
        <CardDescription>Recent lead activities and updates</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          // Loading state with modern skeleton
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          // Empty state with icon
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No recent activity found</p>
          </div>
        ) : (
          // Timeline with modern styling
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            
            {events.map((event) => {
              const config = getEventConfig(event.type);
              return (
                <div key={event.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white shadow-sm`}>
                    {config.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 -mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{event.title}</span>
                      <Badge variant="secondary" className={`${config.bgColor} ${config.textColor} border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{event.relativeTime}</span>
                    </div>
                    
                    {event.type === 'lead_created' && (
                      <div className={`${config.bgColor} rounded-lg p-3 text-sm space-y-2`}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{event.data.email}</span>
                        </div>
                        {event.data.source && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>{event.data.source}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 