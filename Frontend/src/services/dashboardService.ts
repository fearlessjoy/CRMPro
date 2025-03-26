import { firestore as db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

// Interfaces
interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  assignedTo: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  lastContactDate?: any; // Optional - Firestore timestamp
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: any; // Firestore timestamp
  [key: string]: any; // To accommodate other properties
}

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  pendingTasks: number;
  previousPeriodStats?: {
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    pendingTasks: number;
  };
}

/**
 * Fetch dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get all leads
    const leadsSnapshot = await getDocs(collection(db, 'leads'));
    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];

    // Get all tasks
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];

    // Current period stats
    const activeLeads = leads.filter(lead => lead.status === 'active').length;
    const convertedLeads = leads.filter(lead => lead.status === 'converted').length;
    const pendingTasks = tasks.filter(task => !task.completed).length;

    // Previous period stats (simplified for demo)
    // In a real app, you would get data from the previous month
    const previousActiveLeads = Math.floor(activeLeads * 0.85);
    const previousConvertedLeads = Math.floor(convertedLeads * 0.75);
    const previousPendingTasks = Math.floor(pendingTasks * 1.2);
    const previousTotalLeads = Math.floor(leads.length * 0.8);

    return {
      totalLeads: leads.length,
      activeLeads,
      convertedLeads,
      pendingTasks,
      previousPeriodStats: {
        totalLeads: previousTotalLeads,
        activeLeads: previousActiveLeads,
        convertedLeads: previousConvertedLeads,
        pendingTasks: previousPendingTasks
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default values on error
    return {
      totalLeads: 0,
      activeLeads: 0,
      convertedLeads: 0,
      pendingTasks: 0
    };
  }
}

/**
 * Get leads for the current user
 */
export async function getUserLeads(userId: string): Promise<Lead[]> {
  try {
    const q = query(
      collection(db, 'leads'),
      where('assignedTo', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  } catch (error) {
    console.error('Error fetching user leads:', error);
    return [];
  }
}

/**
 * Get recent leads
 */
export async function getRecentLeads(limitCount: number = 5, thisWeekOnly: boolean = false): Promise<Lead[]> {
  try {
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount * 2)); // Fetch extra to filter by week if needed
    
    const snapshot = await getDocs(q);
    let leads = snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle both name field (from leadService) and firstName/lastName fields (from the component)
      return {
        id: doc.id,
        ...data,
        // If name exists but firstName/lastName don't, create them from name
        firstName: data.firstName || (data.name ? data.name.split(' ')[0] : ''),
        lastName: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : '')
      };
    }) as Lead[];
    
    // Filter for this week only if requested
    if (thisWeekOnly) {
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      
      leads = leads.filter(lead => {
        const createdDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
        return isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
      });
    }
    
    // Apply final limit after filtering
    return leads.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching recent leads:', error);
    return [];
  }
}

/**
 * Get distribution of leads by source
 */
export async function getLeadsBySource(): Promise<Record<string, number>> {
  try {
    const leadsSnapshot = await getDocs(collection(db, 'leads'));
    const leads = leadsSnapshot.docs.map(doc => doc.data()) as Lead[];
    
    // Count leads by source
    const sourceDistribution = leads.reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return sourceDistribution;
  } catch (error) {
    console.error('Error fetching leads by source:', error);
    return {};
  }
}

/**
 * Get lead timeline events
 */
export async function getLeadTimeline(limitCount: number = 10): Promise<any[]> {
  try {
    // This would typically fetch from an activities or events collection
    // For demo purposes, we'll create from lead and task data
    
    // Get recent leads
    const leadsSnapshot = await getDocs(
      query(collection(db, 'leads'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount))
    );
    
    // Get recent tasks
    const tasksSnapshot = await getDocs(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount))
    );
    
    // Create timeline events from leads
    const leadEvents = leadsSnapshot.docs.map(doc => {
      const data = doc.data();
      const lead = { 
        id: doc.id, 
        ...data,
        // Handle leads with either format
        firstName: data.firstName || (data.name ? data.name.split(' ')[0] : ''),
        lastName: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : '')
      } as Lead;
      
      // Get the name in appropriate format
      const leadName = lead.name || `${lead.firstName} ${lead.lastName}`.trim();
      
      return {
        id: `lead-${lead.id}`,
        type: 'lead_created',
        title: `New Lead: ${leadName}`,
        timestamp: lead.createdAt,
        relativeTime: formatDistanceToNow(
          lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt),
          { addSuffix: true }
        ),
        data: lead
      };
    });
    
    // Create timeline events from tasks
    const taskEvents = tasksSnapshot.docs.map(doc => {
      const task = { id: doc.id, ...doc.data() } as Task;
      return {
        id: `task-${task.id}`,
        type: 'task_created',
        title: `Task Created: ${task.title}`,
        timestamp: task.createdAt,
        relativeTime: formatDistanceToNow(
          task.createdAt?.toDate ? task.createdAt.toDate() : new Date(task.createdAt),
          { addSuffix: true }
        ),
        data: task
      };
    });
    
    // Combine and sort by timestamp (descending)
    const allEvents = [...leadEvents, ...taskEvents].sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Return limited number of events
    return allEvents.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching lead timeline:', error);
    return [];
  }
} 