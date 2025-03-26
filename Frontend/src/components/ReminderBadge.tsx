import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRemindersByUser } from '@/services/reminderService';

interface ReminderBadgeProps {
  className?: string;
}

export function ReminderBadge({ className = '' }: ReminderBadgeProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkPendingReminders = async () => {
      if (!currentUser) return;

      try {
        const reminders = await getRemindersByUser(currentUser.uid);
        const now = new Date();
        
        // Count reminders that are pending and either:
        // 1. Past their notification time but before due date
        // 2. Past their due date (overdue)
        const count = reminders.filter(reminder => {
          if (reminder.status !== 'pending') return false;
          
          const dueDate = reminder.dueDate.toDate();
          const notifyBefore = reminder.notifyBefore || 0;
          const notificationTime = new Date(dueDate.getTime() - (notifyBefore * 60 * 1000));
          
          return now >= notificationTime;
        }).length;

        setPendingCount(count);
      } catch (error) {
        console.error('Error checking pending reminders:', error);
      }
    };

    checkPendingReminders();
    const interval = setInterval(checkPendingReminders, 60000);

    return () => clearInterval(interval);
  }, [currentUser]);

  if (pendingCount === 0) return null;

  return (
    <div className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-xs font-bold ${className}`}>
      {pendingCount}
    </div>
  );
} 