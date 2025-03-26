import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reminder, getRemindersByUser, updateReminderStatus } from "@/services/reminderService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { checkForDueReminders } from "@/services/notificationService";

export function RemindersDashboard() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadReminders();
    }
  }, [currentUser]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;
      
      const data = await getRemindersByUser(currentUser.uid);
      setReminders(data);
    } catch (error) {
      console.error("Error loading reminders:", error);
      toast({
        title: "Error",
        description: "Failed to load reminders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reminderId: string, status: Reminder["status"]) => {
    try {
      if (!currentUser) return;

      await updateReminderStatus(reminderId, status, currentUser.uid);
      loadReminders();

      toast({
        title: "Status updated",
        description: `Reminder marked as ${status}`,
      });
    } catch (error) {
      console.error("Error updating reminder status:", error);
      toast({
        title: "Error",
        description: "Failed to update reminder status",
        variant: "destructive",
      });
    }
  };

  const navigateToLead = (leadId: string) => {
    navigate(`/leads/${leadId}?tab=reminders`);
  };

  const getPriorityColor = (priority: Reminder["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: Reminder["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "overdue":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading reminders...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reminders</h3>
              <p className="text-sm text-gray-600">
                You have no pending reminders.
              </p>
            </div>
          ) : (
            reminders.map((reminder) => (
              <Card key={reminder.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{reminder.title}</h3>
                        <Badge className={getPriorityColor(reminder.priority)}>
                          {reminder.priority}
                        </Badge>
                        <Badge className={getStatusColor(reminder.status)}>
                          {reminder.status}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-600">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(reminder.dueDate.toDate(), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToLead(reminder.leadId)}
                      >
                        View Lead
                      </Button>
                      {reminder.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(reminder.id, "completed")}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 