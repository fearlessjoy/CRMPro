import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { DashboardLayoutItem } from "@/contexts/DashboardLayoutContext";

interface DraggableDashboardRowProps {
  rowId: number;
  items: DashboardLayoutItem[];
  children: React.ReactNode;
}

export function DraggableDashboardRow({ 
  rowId, 
  items, 
  children 
}: DraggableDashboardRowProps) {
  // Make the row a droppable area
  const { setNodeRef } = useDroppable({
    id: `row-${rowId}`,
    data: { rowId }
  });

  // Get the ids of the items in this row for SortableContext
  const itemIds = items.map(item => item.id);

  return (
    <SortableContext 
      items={itemIds} 
      strategy={horizontalListSortingStrategy}
    >
      <div 
        ref={setNodeRef} 
        className="grid gap-4 grid-cols-12 mb-4"
      >
        {children}
      </div>
    </SortableContext>
  );
} 