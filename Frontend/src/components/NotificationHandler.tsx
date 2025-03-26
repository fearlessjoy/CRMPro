import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRemindersByUser } from '@/services/reminderService';
import { checkForDueReminders, requestNotificationPermission } from '@/services/notificationService';

export function NotificationHandler() {
  const { currentUser } = useAuth();

  useEffect(() => {
    const setupNotifications = async () => {
      const granted = await requestNotificationPermission();
      console.log('Notification permission status:', granted ? 'granted' : 'denied');
    };

    setupNotifications();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const checkForReminders = async () => {
      try {
        console.log('Fetching reminders for notification check...');
        const reminders = await getRemindersByUser(currentUser.uid);
        console.log(`Found ${reminders.length} reminders to check`);
        checkForDueReminders(reminders);
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    // Check immediately
    checkForReminders();

    // Then check every 30 seconds
    const interval = setInterval(checkForReminders, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // This is a utility component that doesn't render anything
  return null;
} 