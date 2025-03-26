import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { DashboardLayoutItem } from "@/contexts/DashboardLayoutContext";
import { ReactNode } from "react";

interface DraggableDashboardItemProps {
  item: DashboardLayoutItem;
  children: ReactNode;
  description?: string;
}

export function DraggableDashboardItem({
  item,
  children,
  description
}: DraggableDashboardItemProps) {
  // Use the useSortable hook to make the item draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  // Apply styles from dnd-kit
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 'auto'
  };

  // Set column span based on item width
  let colSpanClass = '';
  if (item.width === 3) colSpanClass = 'col-span-3 lg:col-span-3';
  else if (item.width === 6) colSpanClass = 'col-span-12 lg:col-span-6';
  else if (item.width === 4) colSpanClass = 'col-span-6 lg:col-span-4';
  else colSpanClass = 'col-span-12';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colSpanClass} transition-all duration-200`}
    >
      <Card className="h-full overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-border/40">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 bg-card">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium text-card-foreground">
              {item.title}
            </CardTitle>
            {(description || item.description) && (
              <CardDescription>{description || item.description}</CardDescription>
            )}
          </div>
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-primary/10 text-primary/80"
            title="Drag to rearrange"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  );
} 