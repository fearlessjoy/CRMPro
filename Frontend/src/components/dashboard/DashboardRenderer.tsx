import { useState } from "react";
import { 
  DndContext, 
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useDashboardLayout, DashboardLayoutItem } from "@/contexts/DashboardLayoutContext";
import { DraggableDashboardRow } from "./DraggableDashboardRow";
import { DraggableDashboardItem } from "./DraggableDashboardItem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Undo } from "lucide-react";

// Component registry - maps componentType to the actual components
import { Overview } from "./Overview";
import { RecentLeads } from "./RecentLeads";
import { LeadsBySource } from "./LeadsBySource";
import { LeadTimeline } from "./LeadTimeline";
import { UnreadMessages } from "./UnreadMessages";

// Component to render a dashboard item based on its type
const DashboardItemRenderer = ({ item }: { item: DashboardLayoutItem }) => {
  switch (item.componentType) {
    case "LeadStats":
      // The lead stats components are handled directly in the Dashboard page
      return <div className="h-full flex items-center justify-center text-muted-foreground">Stats component</div>;
    
    case "Overview":
      return <Overview />;
    
    case "RecentLeads":
      return <RecentLeads />;
    
    case "PendingTasks":
      return <div className="h-full flex items-center justify-center text-muted-foreground">Tasks component</div>;
    
    case "LeadProgress":
      return <div className="h-full flex items-center justify-center text-muted-foreground">Progress component</div>;
    
    case "NewLeadsThisWeek":
      return <RecentLeads thisWeekOnly={true} title="New Leads This Week" description="Leads that were added during the current week" />;
    
    case "LeadTimeline":
      return <LeadTimeline />;
    
    case "UnreadMessages":
      return <UnreadMessages limit={5} />;
    
    case "LeadsBySource":
      return <LeadsBySource />;
    
    default:
      return <div className="text-red-500">Unknown component type: {item.componentType}</div>;
  }
};

export function DashboardRenderer() {
  const { layout, updateLayout, resetToDefaultLayout, moveItem } = useDashboardLayout();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging
      },
    })
  );

  // Group items by row
  const rows = layout.reduce((acc, item) => {
    if (!acc[item.row]) {
      acc[item.row] = [];
    }
    acc[item.row].push(item);
    return acc;
  }, {} as Record<number, DashboardLayoutItem[]>);

  // Sort items within each row
  Object.keys(rows).forEach(rowId => {
    rows[parseInt(rowId)] = rows[parseInt(rowId)].sort((a, b) => a.order - b.order);
  });
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      moveItem(active.id as string, over.id as string);
    }
    
    setActiveId(null);
  };
  
  // Find the currently active item
  const activeItem = activeId ? layout.find(item => item.id === activeId) : null;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetToDefaultLayout} className="mb-4">
          <Undo className="h-4 w-4 mr-2" />
          Reset Layout
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Render each row */}
        {Object.entries(rows)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rowId, items]) => (
            <DraggableDashboardRow 
              key={`row-${rowId}`} 
              rowId={parseInt(rowId)} 
              items={items}
            >
              {items.map(item => (
                <DraggableDashboardItem key={item.id} item={item}>
                  <DashboardItemRenderer item={item} />
                </DraggableDashboardItem>
              ))}
            </DraggableDashboardRow>
          ))}
        
        {/* Drag overlay */}
        <DragOverlay adjustScale={true}>
          {activeItem ? (
            <div className="opacity-50">
              <Card className="pointer-events-none">
                <CardContent className="p-4">
                  {activeItem.title}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 