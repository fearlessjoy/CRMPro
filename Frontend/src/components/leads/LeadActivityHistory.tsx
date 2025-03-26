import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadStageHistory } from "@/services/leadService";
import { Process, Stage } from "@/services/leadProcessService";
import { getUserById } from "@/services/userService";
import { Timestamp } from "firebase/firestore";
import { Clock, User, ArrowRight } from "lucide-react";

interface LeadActivityHistoryProps {
  stageHistory: LeadStageHistory[];
  processes: { [key: string]: Process & { stages: { [key: string]: Stage } } };
}

interface EnrichedActivity extends LeadStageHistory {
  userName: string;
  processName: string;
  stageName: string;
}

export function LeadActivityHistory({ stageHistory, processes }: LeadActivityHistoryProps) {
  const [enrichedActivities, setEnrichedActivities] = useState<EnrichedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enrichActivities = async () => {
      try {
        const enrichedData = await Promise.all(
          stageHistory.map(async (activity) => {
            try {
              // Get user information
              let userName = 'System';
              if (activity.updatedBy) {
                try {
                  const user = await getUserById(activity.updatedBy);
                  userName = user?.displayName || user?.name || user?.email || 'Unknown User';
                } catch (error) {
                  console.error('Error fetching user:', activity.updatedBy, error);
                  userName = 'Unknown User';
                }
              }
              
              // Get process and stage names
              const process = processes[activity.processId];
              const stage = process?.stages?.[activity.stageId];
              
              return {
                ...activity,
                userName,
                processName: process?.name || 'Unknown Process',
                stageName: stage?.name || 'Unknown Stage',
              };
            } catch (error) {
              console.error('Error processing activity:', error);
              return {
                ...activity,
                userName: 'Error',
                processName: 'Error',
                stageName: 'Error',
              };
            }
          })
        );

        setEnrichedActivities(enrichedData);
      } catch (error) {
        console.error("Error enriching activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    enrichActivities();
  }, [stageHistory, processes]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading activity history...</div>;
  }

  if (enrichedActivities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activity History</h3>
          <p className="text-sm text-gray-600">
            There is no activity history for this lead yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enrichedActivities.map((activity, index) => (
            <div key={index} className="border-l-2 border-blue-500 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{activity.processName}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-blue-600">{activity.stageName}</span>
                  </div>
                  {activity.notes && (
                    <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{activity.userName}</span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 