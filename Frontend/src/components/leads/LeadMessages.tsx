import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Send, 
  PaperclipIcon, 
  Clock, 
  CheckCircle2, 
  Image, 
  File, 
  AlertCircle,
  X
} from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lead } from "@/services/leadService";
import * as userService from "@/services/userService";
import * as messageService from "@/services/messageService";
import { Message } from "@/services/messageService";
import { format } from "date-fns";

interface LeadMessagesProps {
  leadId: string;
  lead?: Lead;
  isLeadPortal?: boolean;
}

export function LeadMessages({ leadId, lead, isLeadPortal = false }: LeadMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ fileName: string; fileUrl: string; fileType: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [representativeName, setRepresentativeName] = useState("Representative");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine the sender type based on whether we're in the lead portal or representative view
  const senderType = isLeadPortal ? 'lead' : 'representative';
  
  // Use useCallback to memoize this function to avoid unnecessary rerenders
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mark messages as read when viewing
      await messageService.markMessagesAsRead(leadId, senderType);
      
      // Get representative name if in lead portal
      if (!isLeadPortal && lead?.assignedTo) {
        try {
          const assignedUser = await userService.getUserById(lead.assignedTo);
          if (assignedUser) {
            setRepresentativeName(assignedUser.displayName || assignedUser.name || assignedUser.email || "Representative");
          }
        } catch (err) {
          console.error("Error fetching representative info:", err);
        }
      }
    } catch (err) {
      console.error("Error in initial message setup:", err);
      setError("Failed to load messages. Please try again.");
      setLoading(false);
    }
  }, [leadId, senderType, isLeadPortal, lead]);

  // Set up message subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupMessageSubscription = async () => {
      try {
        // Initial load operations
        await loadMessages();
        
        console.log(`Setting up message subscription for lead: ${leadId}, senderType: ${senderType}`);
        
        // Subscribe to real-time updates
        unsubscribe = messageService.subscribeToMessages(leadId, (newMessages) => {
          console.log(`Received ${newMessages.length} messages in subscription update`);
          console.log('Messages data:', JSON.stringify(newMessages.map(m => ({ 
            id: m.id,
            message: m.message,
            senderType: m.senderType,
            senderName: m.senderName 
          }))));
          setMessages(newMessages);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up message subscription:", err);
        setError("Failed to connect to messaging service. Please refresh the page.");
        setLoading(false);
      }
    };

    // Set up subscription
    setupMessageSubscription();

    // Cleanup subscription on component unmount
    return () => {
      console.log("Cleaning up message subscription");
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [leadId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a small timeout to ensure DOM is updated
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      setSending(true);
      
      // For the lead portal, the sender is the lead
      // For the representative view, the sender is the current user
      const senderId = isLeadPortal 
        ? leadId 
        : (currentUser?.uid || "unknown");
      
      const senderName = isLeadPortal 
        ? (lead?.name || "Lead") 
        : (currentUser?.displayName || currentUser?.email || "Representative");
      
      // Add a temporary optimistic message to the UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        leadId: leadId,
        senderId: senderId,
        senderName: senderName,
        senderType: senderType,
        message: newMessage,
        timestamp: { toDate: () => new Date() } as any,
        read: false,
        attachments: attachments,
      };
      
      // Update UI immediately for better UX
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Clear the form immediately for better UX
      setNewMessage("");
      setAttachments([]);
      
      // Actually send the message in the background
      await messageService.sendMessage(
        leadId,
        senderId,
        senderName,
        senderType,
        newMessage,
        attachments
      );
      
      // The subscription should automatically update with the new message
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setFileUploading(true);
      
      // Upload each file and get the download URL
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = `${lead?.name.replace(/\s+/g, '-').toLowerCase() || 'lead'}-${Date.now()}.${fileExtension}`;
        const filePath = `messages/${leadId}/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        // Upload the file
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Wait for the upload to complete
        return new Promise<{ fileName: string; fileUrl: string; fileType: string }>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              // Track upload progress if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress: ${progress}%`);
            },
            (error) => {
              console.error("Error uploading file:", error);
              reject(error);
            },
            async () => {
              // Get the download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileUrl: downloadURL,
                fileType: file.type,
              });
            }
          );
        });
      });
      
      // Wait for all uploads to complete
      const newAttachments = await Promise.all(uploadPromises);
      
      // Add the new attachments to the existing ones
      setAttachments([...attachments, ...newAttachments]);
    } catch (err) {
      console.error("Error uploading files:", err);
      setError("Failed to upload files. Please try again.");
    } finally {
      setFileUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    try {
      // Handle both server timestamp and Firestore timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return format(timestamp.toDate(), "MMM d, h:mm a");
      } else if (timestamp instanceof Date) {
        return format(timestamp, "MMM d, h:mm a");
      } else if (typeof timestamp === 'number') {
        return format(new Date(timestamp), "MMM d, h:mm a");
      }
      return "Just now";
    } catch (err) {
      console.error("Error formatting timestamp:", err, timestamp);
      return "Just now";
    }
  };

  return (
    <Card className="flex flex-col h-full max-h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle>
          {isLeadPortal 
            ? `Chat with ${representativeName}` 
            : `Chat with ${lead?.name || "Lead"}`}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
        
        <div className="px-4 py-2 text-xs text-gray-500 border-b">
          Messages are stored securely. Please do not share sensitive personal information.
        </div>
        
        <div className="overflow-y-auto h-[350px] p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">No messages yet</p>
              <p className="text-xs text-gray-500 max-w-[250px]">
                {isLeadPortal 
                  ? "Start a conversation with your representative." 
                  : "Start a conversation with this lead."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-2 py-1 text-xs text-gray-500 text-center">
                Your messages appear on the right, received messages on the left.
                <br />
                Current user type: {senderType}
              </div>
              {messages.map((msg, index) => {
                // Add debugging info to help troubleshoot
                console.log(`Rendering message ${index}:`, { 
                  msgId: msg.id,
                  msgSenderType: msg.senderType, 
                  currentSenderType: senderType,
                  isSentByCurrentUser: msg.senderType === senderType
                });
                
                return (
                  <div 
                    key={msg.id || index}
                    className={`flex ${msg.senderType === senderType ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.senderType === senderType 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-muted'
                      }`}
                    >
                      {/* Add subtle indicator of message type */}
                      <div className="text-sm mb-1 flex justify-between">
                        <span className="font-medium">{msg.senderName}</span>
                        <span className="text-xs opacity-80">
                          {msg.senderType === 'lead' ? '(Lead)' : '(Rep)'}
                        </span>
                      </div>
                      
                      <div className="font-medium">
                        {msg.message}
                      </div>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((attachment, i) => (
                            <a 
                              key={i}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center p-2 rounded ${
                                msg.senderType === senderType 
                                  ? 'bg-blue-700 text-white hover:bg-blue-800' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {getFileIcon(attachment.fileType)}
                              <span className="ml-2 text-sm truncate">
                                {attachment.fileName}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-end mt-1 text-xs ${
                        msg.senderType === senderType 
                          ? 'text-blue-100' 
                          : 'opacity-80'
                      }`}>
                        {formatTimestamp(msg.timestamp)}
                        {msg.read && (
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </CardContent>
      
      <Separator />
      
      {attachments.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div 
              key={index}
              className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs"
            >
              {getFileIcon(attachment.fileType)}
              <span className="ml-2 max-w-[150px] truncate">
                {attachment.fileName}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <CardFooter className="pt-3 pb-4 px-4">
        <div className="flex w-full items-end gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[80px] flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={fileUploading}
                  >
                    {fileUploading ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <PaperclipIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach files</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              multiple
            />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={sending || (newMessage.trim() === "" && attachments.length === 0)}
                  >
                    {sending ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 