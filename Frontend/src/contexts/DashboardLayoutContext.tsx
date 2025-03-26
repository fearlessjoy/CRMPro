import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Define the structure of a dashboard item
export interface DashboardLayoutItem {
  id: string;
  title: string;
  description?: string;
  componentType: string;
  row: number;
  order: number;
  width: number; // Number of columns the item spans (1-12 in a 12-column grid)
  height?: number; // Optional height in pixels or 'auto'
}

// Default dashboard layout
const defaultLayout: DashboardLayoutItem[] = [
  // Row 1 - Stats Cards (handled separately in Dashboard.tsx)
  {
    id: 'stats-leads',
    title: 'Total Leads',
    description: 'Total number of leads in the system',
    componentType: 'LeadStats',
    row: 1,
    order: 1,
    width: 3,
  },
  {
    id: 'stats-active-leads',
    title: 'Active Leads',
    description: 'Number of active leads',
    componentType: 'LeadStats',
    row: 1,
    order: 2,
    width: 3,
  },
  {
    id: 'stats-converted-leads',
    title: 'Converted Leads',
    description: 'Number of converted leads',
    componentType: 'LeadStats',
    row: 1,
    order: 3,
    width: 3,
  },
  {
    id: 'stats-pending-tasks',
    title: 'Pending Tasks',
    description: 'Number of pending tasks',
    componentType: 'LeadStats',
    row: 1,
    order: 4,
    width: 3,
  },
  
  // Row 2
  {
    id: 'overview',
    title: 'Overview',
    description: 'Quick overview of your leads and tasks',
    componentType: 'Overview',
    row: 2,
    order: 1,
    width: 6,
  },
  {
    id: 'recent-leads',
    title: 'Recent Leads',
    description: 'Recently added or updated leads',
    componentType: 'RecentLeads',
    row: 2,
    order: 2,
    width: 6,
  },
  
  // Row 3
  {
    id: 'new-leads-this-week',
    title: 'New Leads This Week',
    description: 'Leads added during the current week',
    componentType: 'NewLeadsThisWeek',
    row: 3,
    order: 1,
    width: 6,
  },
  {
    id: 'lead-timeline',
    title: 'Lead Timeline',
    description: 'Timeline of recent lead activities',
    componentType: 'LeadTimeline',
    row: 3,
    order: 2,
    width: 6,
  },
  
  // Row 4
  {
    id: 'unread-messages',
    title: 'Unread Messages',
    description: 'Messages that need your attention',
    componentType: 'UnreadMessages',
    row: 4,
    order: 1,
    width: 6,
  },
  {
    id: 'leads-by-source',
    title: 'Leads by Source',
    description: 'Distribution of leads by their source',
    componentType: 'LeadsBySource',
    row: 4,
    order: 2,
    width: 6,
  },
];

// Context type
interface DashboardLayoutContextType {
  layout: DashboardLayoutItem[];
  updateLayout: (newLayout: DashboardLayoutItem[]) => void;
  resetToDefaultLayout: () => void;
  moveItem: (activeId: string, overId: string) => void;
  addItem: (item: Omit<DashboardLayoutItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
}

// Create the context
const DashboardLayoutContext = createContext<DashboardLayoutContextType | undefined>(undefined);

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const [savedLayout, setSavedLayout] = useLocalStorage<DashboardLayoutItem[]>(
    'dashboard-layout',
    defaultLayout
  );
  const [layout, setLayout] = useState<DashboardLayoutItem[]>(savedLayout);

  // Update localStorage when layout changes
  useEffect(() => {
    setSavedLayout(layout);
  }, [layout, setSavedLayout]);

  // Update the entire layout
  const updateLayout = (newLayout: DashboardLayoutItem[]) => {
    setLayout(newLayout);
  };

  // Reset to default layout
  const resetToDefaultLayout = () => {
    setLayout(defaultLayout);
  };

  // Move an item in the layout (drag and drop)
  const moveItem = (activeId: string, overId: string) => {
    setLayout((items) => {
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return items;
      
      const activeItem = items[oldIndex];
      const overItem = items[newIndex];
      
      // If items are in the same row, just reorder
      if (activeItem.row === overItem.row) {
        const reordered = [...items];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, activeItem);
        
        // Update order values within the row
        const rowItems = reordered.filter(item => item.row === activeItem.row);
        rowItems.forEach((item, index) => {
          item.order = index + 1;
        });
        
        return reordered;
      }
      
      // If items are in different rows, move the active item to the new row
      const updatedItems = items.map(item => {
        if (item.id === activeId) {
          return {
            ...item,
            row: overItem.row,
            order: overItem.order // Initially place at same order
          };
        }
        return item;
      });
      
      // Reorder all items in the target row
      const targetRowItems = updatedItems.filter(item => item.row === overItem.row);
      targetRowItems.sort((a, b) => a.order - b.order);
      
      // Re-assign order values
      targetRowItems.forEach((item, index) => {
        item.order = index + 1;
      });
      
      return updatedItems;
    });
  };

  // Add a new item to the layout
  const addItem = (item: Omit<DashboardLayoutItem, 'id'>) => {
    const newItem: DashboardLayoutItem = {
      ...item,
      id: uuidv4(), // Generate a unique ID
    };
    setLayout((prevLayout) => [...prevLayout, newItem]);
  };

  // Remove an item from the layout
  const removeItem = (itemId: string) => {
    setLayout((prevLayout) => prevLayout.filter((item) => item.id !== itemId));
  };

  return (
    <DashboardLayoutContext.Provider
      value={{
        layout,
        updateLayout,
        resetToDefaultLayout,
        moveItem,
        addItem,
        removeItem,
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
}

// Custom hook to use the context
export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (context === undefined) {
    throw new Error('useDashboardLayout must be used within a DashboardLayoutProvider');
  }
  return context;
} 