import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import * as leadService from "@/services/leadService";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Note {
  id: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

interface LeadNotesProps {
  leadId: string;
}

export function LeadNotes({ leadId }: LeadNotesProps) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const fetchedNotes = await leadService.getLeadNotes(leadId);
      setNotes(fetchedNotes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setSubmitting(true);
    try {
      await leadService.addLeadNote(leadId, newNote, currentUser?.email || "System");
      setNewNote("");
      setIsAddNoteDialogOpen(false);
      await fetchNotes(); // Refresh notes after adding
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return "N/A";
    
    try {
      // Handle Firebase Timestamp
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy h:mm a');
      }
      
      // Handle regular Date objects or ISO strings
      return format(new Date(date), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lead Notes</CardTitle>
          <Button onClick={() => setIsAddNoteDialogOpen(true)}>
            Add Note
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No notes yet</div>
          ) : (
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </span>
                      <span className="text-sm font-medium">
                        {note.createdBy || "System"}
                      </span>
                    </div>
                    <p className="whitespace-pre-line">{note.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddNoteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote}
              disabled={submitting || !newNote.trim()}
            >
              {submitting ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 