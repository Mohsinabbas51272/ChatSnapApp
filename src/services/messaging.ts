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
  deleteField,
  increment
} from 'firebase/firestore';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { db } from './firebaseConfig';
import { sendLocalNotification } from './notifications';
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
  storyReply?: {
    storyId: string;
    imageUri: string;
    authorName: string;
  };
}

import * as FileSystem from 'expo-file-system/legacy';

const convertToBase64 = async (uri: string, type: 'snap' | 'image' | 'voice'): Promise<string> => {
  try {
    if (type === 'snap' || type === 'image') {
      // Aggressive compression and resizing for database-only storage
      const result = await manipulateAsync(
        uri,
        [{ resize: { width: 600 } }], // Max width 600px for even faster loading
        { compress: 0.4, format: SaveFormat.JPEG, base64: true }
      );
      return `data:image/jpeg;base64,${result.base64}`;
    } else {
      // Voice notes still use standard base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return `data:audio/m4a;base64,${base64}`;
    }
  } catch (error) {
    console.error('Error converting to base64:', error);
    throw error;
  }
};

export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  text: string, 
  type: 'text' | 'image' | 'snap' | 'voice' = 'text', 
  timer?: number,
  duration?: number,
  filter?: string,
  storyReply?: Message['storyReply']
) => {
  try {
    if (!senderId || !receiverId) {
      console.error('Invalid sender or receiver ID');
      return;
    }

    const conversationId = [senderId, receiverId].sort().join('_');
    const messagesRef = collection(db, 'messages');
    
    let processedText = text;
    if (type === 'image' || type === 'snap' || type === 'voice') {
      processedText = await convertToBase64(text, type);
    }

    const messageData: any = {
      senderId,
      receiverId,
      conversationId,
      text: processedText,
      type,
      timestamp: serverTimestamp(),
      viewed: false,
      received: false,
    };

    if (timer) messageData.timer = timer;
    if (duration) messageData.duration = duration;
    if (filter) messageData.filter = filter;
    if (storyReply) messageData.storyReply = storyReply;

    await addDoc(messagesRef, messageData);

    // Increment snap counter if message is a snap or image
    if (type === 'snap' || type === 'image') {
      const userRef = doc(db, 'users', senderId);
      await updateDoc(userRef, {
        snapCount: increment(1)
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
  }
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
      const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : Date.now() + 100);
      const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : Date.now() + 100);
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
  }, (error) => {
    console.warn('Snapshot error in subscribeToMessages:', error.message);
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
  }, (error) => {
    console.warn('Snapshot error in subscribeToConversations (sent):', error.message);
  });

  const receivedUnsub = onSnapshot(receivedQuery, (snapshot) => {
    receivedMessages = snapshot.docs.map(doc => ({ ...(doc.data() as Message), id: doc.id }));
    updateList();
  }, (error) => {
    console.warn('Snapshot error in subscribeToConversations (received):', error.message);
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
  }, (error) => {
    console.warn('Snapshot error in subscribeToTypingStatus:', error.message);
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
  }, (error) => {
    console.warn('Snapshot error in subscribeToSecretConversations:', error.message);
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
