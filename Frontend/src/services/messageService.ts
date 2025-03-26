import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { nanoid } from 'nanoid';

// Message interface
export interface Message {
  id: string;
  leadId: string;
  senderId: string;
  senderName: string;
  senderType: 'lead' | 'representative';
  message: string;
  timestamp: Timestamp;
  read: boolean;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileType: string;
  }[];
}

/**
 * Sends a message from a lead to their representative or vice versa
 */
export const sendMessage = async (
  leadId: string,
  senderId: string,
  senderName: string,
  senderType: 'lead' | 'representative',
  message: string,
  attachments?: { fileName: string; fileUrl: string; fileType: string }[]
): Promise<string> => {
  try {
    console.log('Sending message with data:', {
      leadId,
      senderId,
      senderName,
      senderType,
      messageLength: message.length,
      attachmentsCount: attachments?.length || 0
    });
    
    const messagesRef = collection(firestore, 'messages');
    
    // Create a unique message ID
    const messageId = nanoid();
    
    const messageData = {
      id: messageId,
      leadId,
      senderId,
      senderName,
      senderType,
      message,
      timestamp: serverTimestamp(), // This creates a server-side timestamp
      read: false,
      attachments: attachments || []
    };
    
    console.log('Created message data object:', JSON.stringify(messageData));
    
    // Use the message ID as the document ID for easier reference
    const docRef = await addDoc(messagesRef, messageData);
    
    console.log(`Message sent with ID: ${docRef.id} for lead: ${leadId}, senderType: ${senderType}`);
    
    // If it's a lead message, mark it as unread for representatives
    if (senderType === 'lead') {
      await updateUnreadCountForLead(leadId, true);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Gets all messages for a specific lead
 */
export const getMessagesForLead = async (leadId: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(firestore, 'messages');
    const q = query(
      messagesRef, 
      where('leadId', '==', leadId),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Message;
      messages.push({
        ...data,
        id: doc.id,
      });
    });
    
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Subscribe to messages for a specific lead
 * Returns an unsubscribe function
 */
export const subscribeToMessages = (
  leadId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  try {
    console.log(`Setting up message subscription for leadId: ${leadId}`);
    const messagesRef = collection(firestore, 'messages');
    
    // Make sure we're querying the right collection
    console.log(`Query path: ${messagesRef.path}`);
    
    const q = query(
      messagesRef,
      where('leadId', '==', leadId),
      orderBy('timestamp', 'asc')
    );
    
    console.log('Query parameters:', {
      collectionPath: messagesRef.path,
      whereField: 'leadId',
      whereValue: leadId,
      orderByField: 'timestamp',
      direction: 'asc'
    });
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`onSnapshot triggered with ${querySnapshot.size} documents`);
      
      const messages: Message[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        console.log(`Document ${docSnapshot.id} data:`, {
          id: docSnapshot.id, 
          dataSenderId: data.senderId,
          dataSenderType: data.senderType,
          dataMessage: data.message ? data.message.substring(0, 20) + (data.message.length > 20 ? '...' : '') : null
        });
        
        // Handle the serverTimestamp differences between first write and updates
        const timestamp = data.timestamp 
          ? data.timestamp 
          : { toDate: () => new Date() }; // Provide a fallback for pending writes
        
        messages.push({
          ...data,
          id: docSnapshot.id,
          timestamp: timestamp,
        } as Message);
      });
      
      // Sort messages by timestamp to ensure correct order
      messages.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date();
        const bTime = b.timestamp?.toDate?.() || new Date();
        return aTime.getTime() - bTime.getTime();
      });
      
      console.log(`Sending ${messages.length} messages to callback`);
      callback(messages);
    }, 
    // Add error handling for the subscription
    (error) => {
      console.error("Error in message subscription:", error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    throw error;
  }
};

/**
 * Mark messages as read for a specific lead and sender type
 */
export const markMessagesAsRead = async (
  leadId: string,
  readerType: 'lead' | 'representative'
): Promise<void> => {
  try {
    const messagesRef = collection(firestore, 'messages');
    const q = query(
      messagesRef,
      where('leadId', '==', leadId),
      where('senderType', '==', readerType === 'lead' ? 'representative' : 'lead'),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    const updatePromises = querySnapshot.docs.map(async (document) => {
      await updateDoc(doc(firestore, 'messages', document.id), {
        read: true
      });
    });
    
    await Promise.all(updatePromises);
    
    // If representative is reading lead messages, update unread count
    if (readerType === 'representative') {
      await updateUnreadCountForLead(leadId, false);
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Get the number of unread messages for a specific lead
 */
export const getUnreadMessageCount = async (
  leadId: string,
  readerType: 'lead' | 'representative'
): Promise<number> => {
  try {
    const messagesRef = collection(firestore, 'messages');
    const q = query(
      messagesRef,
      where('leadId', '==', leadId),
      where('senderType', '==', readerType === 'lead' ? 'representative' : 'lead'),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
};

/**
 * Get all leads with unread messages for representatives
 */
export const getLeadsWithUnreadMessages = async (): Promise<string[]> => {
  try {
    console.log('getLeadsWithUnreadMessages: Starting to fetch leads with unread messages');
    
    // Query the unreadMessages collection to get leads with unread > 0
    const unreadRef = collection(firestore, 'unreadMessages');
    console.log('getLeadsWithUnreadMessages: Collection path:', unreadRef.path);
    
    const q = query(unreadRef, where('unreadCount', '>', 0));
    
    const querySnapshot = await getDocs(q);
    console.log(`getLeadsWithUnreadMessages: Query returned ${querySnapshot.size} documents`);
    
    const leadIds: string[] = [];
    querySnapshot.forEach((doc) => {
      console.log(`getLeadsWithUnreadMessages: Lead ${doc.id} has ${doc.data().unreadCount} unread messages`);
      leadIds.push(doc.id);
    });
    
    console.log(`getLeadsWithUnreadMessages: Returning ${leadIds.length} lead IDs:`, leadIds);
    return leadIds;
  } catch (error) {
    console.error('Error getting leads with unread messages:', error);
    throw error;
  }
};

/**
 * Track unread message counts for each lead
 */
const updateUnreadCountForLead = async (
  leadId: string,
  increment: boolean
): Promise<void> => {
  try {
    console.log(`updateUnreadCountForLead: ${increment ? 'Incrementing' : 'Resetting'} unread count for lead ${leadId}`);
    
    if (!leadId) {
      console.error('updateUnreadCountForLead: Invalid leadId provided');
      return;
    }
    
    const unreadRef = doc(firestore, 'unreadMessages', leadId);
    console.log(`updateUnreadCountForLead: Checking document at ${unreadRef.path}`);
    
    const unreadDoc = await getDoc(unreadRef);
    
    let newCount = 0;
    
    if (unreadDoc.exists()) {
      // Update existing document
      const currentCount = unreadDoc.data().unreadCount || 0;
      console.log(`updateUnreadCountForLead: Current count for lead ${leadId} is ${currentCount}`);
      
      newCount = increment ? currentCount + 1 : 0;
      
      await updateDoc(unreadRef, {
        unreadCount: newCount,
        lastUpdated: serverTimestamp()
      });
      console.log(`updateUnreadCountForLead: Updated unread count for lead ${leadId} to ${newCount}`);
    } else {
      // Create new document using set instead of addDoc
      console.log(`updateUnreadCountForLead: No existing document for lead ${leadId}, creating new one`);
      
      newCount = increment ? 1 : 0;
      
      await setDoc(unreadRef, {
        leadId,
        unreadCount: newCount,
        lastUpdated: serverTimestamp()
      });
      console.log(`updateUnreadCountForLead: Created unread message entry for lead ${leadId} with count ${newCount}`);
    }
    
    // Verify the document was updated/created
    const verifyDoc = await getDoc(unreadRef);
    if (verifyDoc.exists()) {
      console.log(`updateUnreadCountForLead: Verification - document exists with count ${verifyDoc.data().unreadCount}`);
    } else {
      console.error(`updateUnreadCountForLead: Verification failed - document does not exist after update`);
    }
  } catch (error) {
    console.error('Error updating unread count:', error);
    // Don't throw the error as this is a non-critical operation
  }
};

/**
 * Get all unread messages across all leads
 */
export const getAllUnreadMessages = async (): Promise<any[]> => {
  try {
    console.log('getAllUnreadMessages: Starting to fetch unread messages');
    
    // Get all leads with unread messages
    const leadIds = await getLeadsWithUnreadMessages();
    console.log(`getAllUnreadMessages: Found ${leadIds.length} leads with unread messages:`, leadIds);
    
    if (leadIds.length === 0) {
      console.log('getAllUnreadMessages: No leads with unread messages found, returning empty array');
      return [];
    }
    
    // Get unread messages for each lead
    const messagesRef = collection(firestore, 'messages');
    const allUnreadMessages: any[] = [];
    
    // Process each lead's unread messages
    for (const leadId of leadIds) {
      console.log(`getAllUnreadMessages: Fetching unread messages for lead ${leadId}`);
      
      const q = query(
        messagesRef,
        where('leadId', '==', leadId),
        where('senderType', '==', 'lead'),
        where('read', '==', false),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`getAllUnreadMessages: Found ${querySnapshot.size} unread messages for lead ${leadId}`);
      
      // Get lead name for reference
      let leadName = "Unknown Lead";
      
      // Get the messages
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`getAllUnreadMessages: Processing message ${doc.id} for lead ${leadId}`, {
          senderId: data.senderId,
          senderName: data.senderName,
          senderType: data.senderType,
          timestamp: data.timestamp,
          read: data.read
        });
        
        // Use the sender name from the first message as the lead name
        if (!leadName || leadName === "Unknown Lead") {
          leadName = data.senderName || "Unknown Lead";
        }
        
        allUnreadMessages.push({
          id: doc.id,
          leadId: data.leadId,
          leadName: leadName,
          message: data.message,
          timestamp: data.timestamp,
          sender: data.senderName,
          isRead: false
        });
      });
    }
    
    console.log(`getAllUnreadMessages: Total unread messages found: ${allUnreadMessages.length}`);
    
    // Sort by timestamp (most recent first)
    allUnreadMessages.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date();
      const bTime = b.timestamp?.toDate?.() || new Date();
      return bTime.getTime() - aTime.getTime();
    });
    
    return allUnreadMessages;
  } catch (error) {
    console.error('Error getting all unread messages:', error);
    return [];
  }
}; 