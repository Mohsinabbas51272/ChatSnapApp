import { db } from './firebaseConfig';
import { 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  limit,
  or,
  and,
  deleteField
} from 'firebase/firestore';import { sendLocalNotification } from './notifications';
export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: 'text' | 'image' | 'snap' | 'voice';
  timestamp: any;
  viewed: boolean;
  received?: boolean;
  readAt?: any;
  reactions?: { [key: string]: string[] };
  timer?: number;
  duration?: number;
  filter?: string;
}

import * as FileSystem from 'expo-file-system';

const convertToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('Error converting to base64:', error);
    throw error;
  }
};

export const sendMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'viewed'>) => {
  let finalMediaData = '';
  
  if (message.type === 'snap' || message.type === 'image') {
    if (message.text.includes('/') || message.text.includes('file:')) {
      const base64 = await convertToBase64(message.text);
      finalMediaData = `data:image/jpeg;base64,${base64}`;
    } else {
      finalMediaData = message.text;
    }
  } else if (message.type === 'voice') {
      const base64 = await convertToBase64(message.text);
      finalMediaData = `data:audio/m4a;base64,${base64}`;
  }

  // Generate a consistent conversation ID (sorted UIDs)
  const conversationId = [message.senderId, message.receiverId].sort().join('_');

  const messagesRef = collection(db, 'messages');
  const messagePayload: any = {
    senderId: message.senderId,
    receiverId: message.receiverId,
    type: message.type,
    conversationId,
    text: message.type === 'text' ? message.text : finalMediaData,
    timer: message.timer ?? null,
    duration: message.duration ?? null,
    timestamp: serverTimestamp(),
    viewed: false,
    received: false,
    readAt: null,
  };

  if (message.filter !== undefined && message.filter !== null) {
    messagePayload.filter = message.filter;
  }

  await addDoc(messagesRef, messagePayload);
};

export const addReaction = async (messageId: string, emoji: string, userId: string, currentReactions: any = {}) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const newReactions = { ...currentReactions };
    
    if (!newReactions[emoji]) {
      newReactions[emoji] = [userId];
    } else if (!newReactions[emoji].includes(userId)) {
      newReactions[emoji] = [...newReactions[emoji], userId];
    } else {
      // Remove if already reacted (toggle)
      newReactions[emoji] = newReactions[emoji].filter((id: string) => id !== userId);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    }

    await updateDoc(messageRef, { reactions: newReactions });
  } catch (error) {
    console.error('Failed to add reaction:', error);
  }
};

export const subscribeToMessages = (
  userId1: string, 
  userId2: string, 
  callback: (messages: Message[]) => void,
  onNewMessage?: (message: Message) => void
) => {
  const conversationId = [userId1, userId2].sort().join('_');
  const messagesRef = collection(db, 'messages');
  
  // Removed orderBy to avoid the need for a composite index
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Message;
      messages.push({ ...data, id: docSnap.id });
    });
    
    // Sort in memory instead of on Firestore server to avoid index requirement
    messages.sort((a, b) => {
      const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp || 0);
      const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp || 0);
      return t1 - t2;
    });

    // Check for new messages from the other user
    if (messages.length > 0 && onNewMessage) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== userId1 && lastMessage.senderId !== userId2) {
        // This shouldn't happen, but just in case
        return;
      }
      
      const otherUserId = lastMessage.senderId === userId1 ? userId2 : userId1;
      if (lastMessage.senderId === otherUserId) {
        onNewMessage(lastMessage);
      }
    }

    callback(messages);
  });
};

export const subscribeToConversations = (
  userId: string,
  callback: (conversations: any[]) => void
) => {
  const messagesRef = collection(db, 'messages');
  
  // Removed orderBy to avoid the need for a composite index
  const sentQuery = query(
    messagesRef, 
    where('senderId', '==', userId),
    limit(100)
  );

  const receivedQuery = query(
    messagesRef, 
    where('receiverId', '==', userId),
    limit(100)
  );

  let sentMessages: Message[] = [];
  let receivedMessages: Message[] = [];

  const updateList = () => {
    const allMessages = [...sentMessages, ...receivedMessages];
    
    // Sort all messages by timestamp descending
    allMessages.sort((a, b) => {
      const t1 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds || 0) * 1000;
      const t2 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds || 0) * 1000;
      return t1 - t2;
    });

    const convMap = new Map();
    allMessages.forEach((data) => {
      const partnerId = data.senderId === userId ? data.receiverId : data.senderId;
      
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId,
          lastMessage: {
            text: data.text,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type,
            viewed: data.viewed,
            senderId: data.senderId,
          },
          unreadCount: (data.receiverId === userId && !data.viewed) ? 1 : 0
        });
      } else if (data.receiverId === userId && !data.viewed) {
        const conv = convMap.get(partnerId);
        conv.unreadCount += 1;
      }
    });

    callback(Array.from(convMap.values()));
  };

  const sentUnsub = onSnapshot(sentQuery, (snapshot) => {
    sentMessages = snapshot.docs.map(doc => ({ ...(doc.data() as Message), id: doc.id }));
    updateList();
  });

  const receivedUnsub = onSnapshot(receivedQuery, (snapshot) => {
    receivedMessages = snapshot.docs.map(doc => ({ ...(doc.data() as Message), id: doc.id }));
    updateList();
  });

  return () => {
    sentUnsub();
    receivedUnsub();
  };
};

export const markAsViewed = async (messageId: string) => {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, { 
    viewed: true,
    readAt: serverTimestamp() 
  });
};

export const markAsReceived = async (messageId: string) => {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, { received: true });
};

// Typing indicators
export const setTypingStatus = async (conversationId: string, userId: string, isTyping: boolean) => {
  const typingRef = doc(db, 'typing', conversationId);
  
  if (isTyping) {
    await setDoc(typingRef, {
      [userId]: {
        timestamp: serverTimestamp(),
        isTyping: true
      }
    }, { merge: true });
  } else {
    await updateDoc(typingRef, {
      [userId]: deleteField()
    });
  }
};

export const subscribeToTypingStatus = (conversationId: string, callback: (typingUsers: string[]) => void) => {
  const typingRef = doc(db, 'typing', conversationId);
  
  return onSnapshot(typingRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const typingUsers: string[] = [];
      
      Object.entries(data).forEach(([userId, status]: [string, any]) => {
        if (status.isTyping) {
          // Check if typing status is recent (within 3 seconds)
          const timestamp = status.timestamp?.toMillis ? status.timestamp.toMillis() : Date.now();
          if (Date.now() - timestamp < 3000) {
            typingUsers.push(userId);
          }
        }
      });
      
      callback(typingUsers);
    } else {
      callback([]);
    }
  });
};
export const toggleSecretChat = async (userId: string, partnerId: string, isSecret: boolean) => {
  const secretRef = doc(db, 'secretConversations', `${userId}_${partnerId}`);
  if (isSecret) {
    await updateDoc(secretRef, { isSecret }).catch(async () => {
      await setDoc(secretRef, { userId, partnerId, isSecret });
    });
  } else {
    await deleteDoc(secretRef);
  }
};

export const subscribeToSecretConversations = (userId: string, callback: (secretPartnerIds: string[]) => void) => {
  const secretRef = collection(db, 'secretConversations');
  const q = query(secretRef, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const ids: string[] = [];
    snapshot.forEach(doc => {
      ids.push(doc.data().partnerId);
    });
    callback(ids);
  });
};

export const deleteMessage = async (messageId: string) => {
  try {
    const msgRef = doc(db, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
};
