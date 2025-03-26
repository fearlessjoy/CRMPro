import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Reminder, createReminder, getRemindersByLead, updateReminderStatus, deleteReminder } from "@/services/reminderService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { requestNotificationPermission, checkForDueReminders } from "@/services/notificationService";

const reminderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.string().min(1, "Assignee is required"),
  notifyBefore: z.coerce.number().min(0, "Must be a positive number").optional(),
});

interface LeadRemindersProps {
  leadId: string;
}

export function LeadReminders({ leadId }: LeadRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderFormSchema>>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      assignedTo: currentUser?.uid || "",
      notifyBefore: 30,
    },
  });

  useEffect(() => {
    loadReminders();
  }, [leadId]);

  // Request notification permission when component mounts
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You will receive notifications for your reminders.",
        });
      }
    });
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await getRemindersByLead(leadId);
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

  const onSubmit = async (values: z.infer<typeof reminderFormSchema>) => {
    try {
      if (!currentUser) return;

      const dueDate = new Date(values.dueDate);
      
      const reminder = await createReminder({
        leadId,
        title: values.title,
        description: values.description,
        dueDate: Timestamp.fromDate(dueDate),
        priority: values.priority as Reminder["priority"],
        assignedTo: values.assignedTo,
        createdBy: currentUser.uid,
        notifyBefore: values.notifyBefore,
      });

      toast({
        title: "Reminder created",
        description: "The reminder has been created successfully",
      });

      // Request notification permission if not already granted
      if (Notification.permission !== "granted") {
        await requestNotificationPermission();
      }

      form.reset();
      setIsDialogOpen(false);
      loadReminders();
    } catch (error) {
      console.error("Error creating reminder:", error);
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
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

  const handleDelete = async (reminderId: string) => {
    try {
      await deleteReminder(reminderId);
      loadReminders();

      toast({
        title: "Reminder deleted",
        description: "The reminder has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Reminders & Follow-ups</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Reminder</DialogTitle>
              <DialogDescription>
                Create a new reminder for this lead. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notifyBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notify Before (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit">Create Reminder</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {reminders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reminders</h3>
              <p className="text-sm text-gray-600">
                There are no reminders set for this lead yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          reminders.map((reminder) => (
            <Card key={reminder.id}>
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
                    {reminder.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(reminder.id, "completed")}
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 