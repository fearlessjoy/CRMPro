import { Reminder } from "./reminderService";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission status:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export const showReminderNotification = (reminder: Reminder) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.log("Notifications not available or permission not granted");
    return;
  }

  const title = `Reminder: ${reminder.title}`;
  const options = {
    body: reminder.description || "No description provided",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: reminder.id,
    requireInteraction: true,
    data: {
      leadId: reminder.leadId,
      reminderId: reminder.id
    },
    silent: false
  };

  try {
    const notification = new Notification(title, options);

    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      window.location.href = `/leads/${reminder.leadId}?tab=reminders`;
    };

    // Play a sound when the notification appears
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(e => console.log('Could not play notification sound:', e));

    console.log(`Notification shown for reminder: ${reminder.id}`);
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

export const checkForDueReminders = (reminders: Reminder[]) => {
  const now = new Date();
  console.log(`Checking reminders at: ${now.toISOString()}`);

  reminders.forEach(reminder => {
    if (reminder.status !== 'pending') {
      return;
    }

    const dueDate = reminder.dueDate.toDate();
    const notifyBefore = reminder.notifyBefore || 0;
    const notificationTime = new Date(dueDate.getTime() - (notifyBefore * 60 * 1000));

    // Calculate time differences in minutes
    const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (60 * 1000));
    const minutesUntilNotification = Math.floor((notificationTime.getTime() - now.getTime()) / (60 * 1000));

    // Debug logging
    console.log(`Reminder ${reminder.id}:`, {
      title: reminder.title,
      status: reminder.status,
      dueDate: dueDate.toISOString(),
      notifyBefore: notifyBefore,
      notificationTime: notificationTime.toISOString(),
      currentTime: now.toISOString(),
      minutesUntilDue,
      minutesUntilNotification,
      shouldNotify: now >= notificationTime && now <= dueDate
    });

    // Get the last notification time from localStorage
    const notificationKey = `reminder_${reminder.id}_notified`;
    const lastNotified = localStorage.getItem(notificationKey);
    const lastNotifiedTime = lastNotified ? new Date(lastNotified) : null;

    // Show notification if:
    // 1. We're past the notification time but before due date
    // 2. We haven't shown this notification in the last minute
    const shouldNotify = 
      now >= notificationTime && 
      now <= dueDate && 
      (!lastNotifiedTime || (now.getTime() - lastNotifiedTime.getTime()) > 60000);

    if (shouldNotify) {
      showReminderNotification(reminder);
      localStorage.setItem(notificationKey, now.toISOString());
    }
  });
}; 