import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentRequirement, LeadDocument, getDocumentRequirementsByProcessAndStage, getLeadDocuments } from "@/services/documentService";
import { FileText } from "lucide-react";
import { useDocumentsRefresh } from "@/hooks/useDocumentsRefresh";

interface DocumentRequirementsBadgeProps {
  leadId: string;
  processId: string;
  stageId: string;
  showTooltip?: boolean;
  variant?: "default" | "dot";
}

export function DocumentRequirementsBadge({ 
  leadId, 
  processId, 
  stageId, 
  showTooltip = true,
  variant = "default"
}: DocumentRequirementsBadgeProps) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { timestamp } = useDocumentsRefresh();

  useEffect(() => {
    const loadData = async () => {
      if (!processId || !stageId) {
        setRequirements([]);
        setDocuments([]);
        setLoading(false);
        return;
      }

      try {
        const [reqs, docs] = await Promise.all([
          getDocumentRequirementsByProcessAndStage(processId, stageId),
          getLeadDocuments(leadId)
        ]);
        
        setRequirements(reqs);
        setDocuments(docs);
      } catch (error) {
        console.error("Error loading document requirements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, processId, stageId, timestamp]);

  if (loading || requirements.length === 0) {
    return null;
  }

  const requiredDocs = requirements.filter(req => req.required);
  const uploadedRequiredDocs = requiredDocs.filter(req => 
    documents.some(doc => doc.requirementId === req.id && doc.status !== "rejected")
  );
  
  const allRequiredUploaded = requiredDocs.length === uploadedRequiredDocs.length;
  const hasRequiredMissing = requiredDocs.length > uploadedRequiredDocs.length;

  // Always show the badge if there are required documents
  if (requiredDocs.length === 0) {
    return null;
  }

  if (variant === "dot") {
    const dot = (
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
    );

    if (!showTooltip) {
      return dot;
    }

    const missingDocs = requiredDocs.filter(req => 
      !documents.some(doc => doc.requirementId === req.id && doc.status !== "rejected")
    );

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {dot}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-medium">Missing Required Documents:</p>
              <ul className="list-disc list-inside">
                {missingDocs.map(doc => (
                  <li key={doc.id} className="text-sm">{doc.name}</li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const badge = (
    <Badge 
      variant={allRequiredUploaded ? "default" : "destructive"}
      className="ml-2 flex items-center gap-1"
    >
      <FileText className="h-3 w-3" />
      {uploadedRequiredDocs.length}/{requiredDocs.length} Required
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const missingDocs = requiredDocs.filter(req => 
    !documents.some(doc => doc.requirementId === req.id && doc.status !== "rejected")
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-medium">Missing Required Documents:</p>
            <ul className="list-disc list-inside">
              {missingDocs.map(doc => (
                <li key={doc.id} className="text-sm">{doc.name}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 