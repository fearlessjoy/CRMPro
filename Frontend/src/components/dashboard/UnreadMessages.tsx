import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUnreadMessages } from "@/services/messageService";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UnreadMessage {
  id: string;
  leadId: string;
  leadName: string;
  message: string;
  timestamp: any;
  sender: string;
  isRead: boolean;
}

interface UnreadMessagesProps {
  limit?: number;
}

export function UnreadMessages({ limit = 5 }: UnreadMessagesProps) {
  const [messages, setMessages] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        console.log('UnreadMessages component: Starting to fetch unread messages');
        setLoading(true);
        const unreadMessages = await getAllUnreadMessages();
        console.log('UnreadMessages component: Received unread messages:', unreadMessages);
        
        setMessages(unreadMessages.slice(0, limit));
        console.log(`UnreadMessages component: Set ${Math.min(unreadMessages.length, limit)} messages to state`);
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      } finally {
        setLoading(false);
        console.log('UnreadMessages component: Finished loading');
      }
    };
    
    fetchUnreadMessages();
    
    // Set up a refresh interval for messages (every 30 seconds)
    const intervalId = setInterval(fetchUnreadMessages, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [limit]);
  
  // Format message preview - truncate if too long
  const formatMessage = (message: string): string => {
    return message.length > 80 ? `${message.substring(0, 80)}...` : message;
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mail className="h-4 w-4 text-primary" />
              {messages.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle>Unread Messages</CardTitle>
              <CardDescription>Messages that need your attention</CardDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium",
                "bg-red-50 text-red-700 hover:bg-red-100",
                "border border-red-200/50"
              )}
            >
              {messages.length} new
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
            <p className="text-muted-foreground">No unread messages</p>
          </div>
        ) : (
          // Message list
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="relative border rounded-lg p-3 space-y-2 bg-card/50 hover:bg-primary/5 transition-colors group">
                {/* Red dot for each unread message */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
                
                <div className="flex items-center justify-between">
                  <Link 
                    to={`/leads/${message.leadId}`} 
                    className="font-medium hover:underline text-sm text-primary"
                  >
                    {message.leadName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {getRelativeTime(message.timestamp)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {formatMessage(message.message)}
                </p>
                
                <div className="flex justify-end pt-1">
                  <Link to={`/leads/${message.leadId}?tab=messages`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-blue-500/90 hover:text-white hover:border-blue-500 transition-all duration-200"
                    >
                      Reply
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <Link to="/messages">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full hover:bg-blue-500/90 hover:text-white hover:border-blue-500 transition-all duration-200"
                >
                  View all messages
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 