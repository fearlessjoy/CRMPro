import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCheck, FilePlus, AlertCircle } from "lucide-react";
import { Document, getRequiredDocuments, getLeadDocuments, uploadLeadDocument } from "@/services/leadDocumentService";
import * as leadService from "@/services/leadService";
import * as leadProcessService from "@/services/leadProcessService";
import { Lead } from "@/services/leadService";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LeadDocumentsProps {
  leadId: string;
}

export function LeadDocuments({ leadId }: LeadDocumentsProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [processName, setProcessName] = useState<string>("");
  const [stageName, setStageName] = useState<string>("");

  // Format date for display
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch lead data
        const leadData = await leadService.getLeadById(leadId);
        setLead(leadData);
        
        if (!leadData) {
          console.error("Could not find lead data for ID:", leadId);
          setLoading(false);
          return;
        }
        
        // Get process and stage information
        let processId = leadData.currentProcessId || 'default';
        let stageId = leadData.currentStageId || null;
        
        setCurrentProcessId(processId);
        setCurrentStageId(stageId);
        
        // Fetch process and stage names
        let processNameVal = "Default Process";
        let stageNameVal = "";
        
        try {
          if (processId && processId !== 'default') {
            const processData = await leadProcessService.getProcessById(processId);
            if (processData) {
              processNameVal = processData.name;
            }
            
            if (stageId) {
              const stageData = await leadProcessService.getStageById(stageId);
              if (stageData) {
                stageNameVal = stageData.name;
              }
            }
          }
        } catch (error) {
          console.error("Error fetching process/stage details:", error);
        }
        
        setProcessName(processNameVal);
        setStageName(stageNameVal);
        
        console.log(`Lead ${leadId} process: ${processId} (${processNameVal}), stage: ${stageId || 'none'} (${stageNameVal || 'none'})`);
        
        // Fetch document requirements based on the lead's process/stage
        let requiredDocs: Document[] = [];
        if (processId) {
          console.log(`Fetching document requirements for lead ${leadId}'s process ${processId} and stage ${stageId || 'none'}`);
          requiredDocs = await getRequiredDocuments(processId, stageId || undefined);
          console.log(`Received ${requiredDocs.length} document requirements for lead ${leadId}`);
        } else {
          // Default documents if no process is assigned
          console.log(`No process assigned for lead ${leadId}, using default document requirements`);
          requiredDocs = await getRequiredDocuments('default');
        }
        
        // Fetch already submitted documents for this lead
        console.log(`Fetching submitted documents for lead ${leadId}`);
        const submittedDocs = await getLeadDocuments(leadId);
        console.log(`Found ${submittedDocs.length} submitted documents for lead ${leadId}`);
        
        // Create a map of document names to help with merging
        const submittedDocsMap = new Map();
        submittedDocs.forEach(doc => {
          submittedDocsMap.set(doc.name.toLowerCase(), doc);
          console.log(`Submitted document: ${doc.name}, status: ${doc.status}`);
        });
        
        // Merge required documents with submitted documents data
        const mergedDocuments = requiredDocs.map(reqDoc => {
          // Check if there's a submitted document matching this requirement
          const matchingSubmitted = submittedDocsMap.get(reqDoc.name.toLowerCase());
          
          // If found, use submitted document's status and data
          if (matchingSubmitted) {
            console.log(`Merging requirement ${reqDoc.name} with submitted document (status: ${matchingSubmitted.status})`);
            return {
              ...reqDoc,
              status: matchingSubmitted.status,
              uploadedAt: matchingSubmitted.uploadedAt,
              fileUrl: matchingSubmitted.fileUrl,
              fileType: matchingSubmitted.fileType,
              notes: matchingSubmitted.notes
            };
          }
          
          // Otherwise return the requirement with not_submitted status
          console.log(`Document requirement ${reqDoc.name} has not been submitted yet`);
          return reqDoc;
        });
        
        console.log(`Final document list for lead ${leadId}: ${mergedDocuments.length} documents`);
        setDocuments(mergedDocuments);
      } catch (error) {
        console.error("Error fetching document data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [leadId]);

  // Get badge color based on document status
  const getStatusBadge = (status: Document["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Review Pending</Badge>;
      case "not_submitted":
        return <Badge variant="outline">Not Submitted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Handle document upload
  const handleUpload = async (docId: string, fileInput: HTMLInputElement) => {
    if (!fileInput.files || !fileInput.files[0]) return;
    
    const file = fileInput.files[0];
    
    try {
      setUploadingDocId(docId);
      
      // Call the upload service
      await uploadLeadDocument(leadId, docId, file);
      
      // Update the document status in the UI
      setDocuments(docs => docs.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: "pending", 
              uploadedAt: new Date(),
              fileUrl: URL.createObjectURL(file),
              fileType: file.type
            } 
          : doc
      ));
      
      // Reset the file input
      fileInput.value = '';
      
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploadingDocId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading document requirements...</div>;
  }

  return (
    <div className="space-y-4">
      {!lead && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Lead information could not be loaded.
          </AlertDescription>
        </Alert>
      )}

      {lead && documents.length === 0 ? (
        <>
          {/* Show process and stage info to help with debugging */}
          {currentProcessId && (
            <Alert>
              <FileCheck className="h-4 w-4" />
              <AlertTitle>No Documents Required</AlertTitle>
              <AlertDescription>
                There are no document requirements for this lead at the current stage.
                <br />
                <span className="text-muted-foreground text-xs">
                  Process: {processName} 
                  {stageName ? ` / Stage: ${stageName}` : ''}
                </span>
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <>
          {/* Show process and stage info only when documents exist */}
          {lead && currentProcessId && (
            <Alert>
              <FileCheck className="h-4 w-4" />
              <AlertTitle>Document Requirements</AlertTitle>
              <AlertDescription>
                Showing requirements for: {processName} 
                {stageName ? ` / Stage: ${stageName}` : ''}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <Card key={doc.id} className={`${doc.required ? 'border-blue-200' : 'border-gray-200'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{doc.name}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(doc.status)}
                      {doc.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2 pt-0 text-sm">
                  {doc.uploadedAt && (
                    <p className="text-muted-foreground">
                      Uploaded: {formatDate(doc.uploadedAt)}
                    </p>
                  )}
                  {doc.notes && (
                    <p className="mt-1 text-muted-foreground">{doc.notes}</p>
                  )}
                </CardContent>
                
                <CardFooter className="pt-0">
                  {doc.status === "not_submitted" || doc.status === "rejected" ? (
                    <div className="w-full">
                      <input
                        type="file"
                        id={`file-${doc.id}`}
                        className="w-full"
                        onChange={(e) => e.target.files && handleUpload(doc.id, e.target)}
                      />
                      <Button 
                        className="w-full mt-2"
                        disabled={uploadingDocId === doc.id}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingDocId === doc.id ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        disabled={!doc.fileUrl}
                        onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
                      >
                        <FileCheck className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                      <input
                        type="file"
                        id={`file-replace-${doc.id}`}
                        className="hidden"
                        onChange={(e) => e.target.files && handleUpload(doc.id, e.target)}
                      />
                      <label 
                        htmlFor={`file-replace-${doc.id}`} 
                        className="flex-1"
                      >
                        <Button 
                          className="w-full"
                          type="button"
                          disabled={uploadingDocId === doc.id}
                        >
                          Replace
                        </Button>
                      </label>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 