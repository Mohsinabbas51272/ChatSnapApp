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
  increment,
  arrayUnion,
  getDocs
} from 'firebase/firestore';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { db, auth } from './firebaseConfig';
import { sendLocalNotification } from './notifications';
export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: 'text' | 'image' | 'snap' | 'voice' | 'document' | 'location' | 'poll';
  location?: { latitude: number; longitude: number };
  poll?: { question: string; options: string[]; votes: { [uid: string]: number } };
  timestamp: any;
  viewed: boolean;
  received?: boolean;
  status? : 'sent' | 'delivered' | 'read';
  readAt?: any;
  reactions?: { [key: string]: string[] };
  timer?: number;
  duration?: number;
  filter?: string;
  isDeleted?: boolean;
  deletedBy?: string[];
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  storyReply?: {
    storyId: string;
    imageUri: string;
    authorName: string;
  };
}

import * as FileSystem from 'expo-file-system/legacy';

const convertToBase64 = async (uri: string, type: 'snap' | 'image' | 'voice'): Promise<string> => {
  try {
    // If already base64, don't re-process
    if (uri.startsWith('data:')) return uri;

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

import { sendPushNotification } from './notifications';

export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  text: string, 
  senderName: string = 'Someone',
  type: 'text' | 'image' | 'snap' | 'voice' | 'document' | 'location' | 'poll' = 'text', 
  duration?: number,
  filter?: string,
  replyTo?: { messageId: string; text: string; senderName: string },
  storyReply?: Message['storyReply'],
  locationAndPoll?: any,
  timer?: number
) => {
  console.log('[DEBUG] sendMessage entered with senderId:', senderId, 'receiverId:', receiverId, 'type:', type);
  try {
    if (!senderId || !receiverId) {
      console.error('[DEBUG] Invalid sender or receiver ID');
      return;
    }

    const conversationId = [senderId, receiverId].sort().join('_');
    console.log('[DEBUG] conversationId created:', conversationId);
    const messagesRef = collection(db, 'messages');
    
    let processedText = text;
    if (type === 'image' || type === 'snap' || type === 'voice') {
      console.log('[DEBUG] Attempting to convertToBase64 for type:', type);
      processedText = await convertToBase64(text, type);
      console.log('[DEBUG] Base64 conversion successful');
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
      status: 'sent',
    };

    if (replyTo) messageData.replyTo = replyTo;
    if (timer) messageData.timer = timer;
    if (duration) messageData.duration = duration;
    if (filter) messageData.filter = filter;
    if (storyReply) messageData.storyReply = storyReply;
    if (type === 'location') messageData.location = locationAndPoll;
    if (type === 'poll') messageData.poll = { ...locationAndPoll, votes: {} };

    console.log('[DEBUG] Payload prepared for addDoc, attempting to insert');
    await addDoc(messagesRef, messageData);
    console.log('[DEBUG] addDoc successful');

    // Send Push Notification to recipient
    let notificationBody = type === 'text' ? text : `Bheja hai ek ${type}`;
    if (type === 'snap') notificationBody = 'Sent you a snap! 👻';
    if (type === 'image') notificationBody = 'Sent you a photo! 📸';
    if (type === 'voice') notificationBody = 'Sent a voice note! 🎙️';
    
    sendPushNotification(
      receiverId,
      senderName,
      notificationBody,
      { type: 'chat', senderId, conversationId }
    );

    // Increment snap counter if message is a snap or image (side-effect)
    if (type === 'snap' || type === 'image') {
      console.log('[DEBUG] Incrementing snap count for sender');
      try {
        const userRef = doc(db, 'users', senderId);
        await updateDoc(userRef, {
          snapCount: increment(1)
        });
      } catch (counterError) {
        console.warn('[DEBUG] Failed to increment snap count:', counterError);
        // Don't fail the message just because the counter failed
      }
    }

    console.log('[DEBUG] sendMessage returning true');
    return true;
  } catch (error) {
    console.error('[DEBUG] Error sending message caught in messaging.ts:', error);
  }
};

export const forwardMessage = async (
  message: Message,
  targetId: string,
  senderId: string,
  senderName: string,
  isGroup: boolean = false
) => {
  try {
    if (isGroup) {
      // Logic for forwarding to group (if group services available)
      // For now, focusing on private chats for task simplicity or if supported by generic send
    } else {
      await sendMessage(
        senderId,
        targetId,
        message.text,
        senderName,
        message.type,
        message.duration,
        message.filter,
        undefined, // don't forward reply context usually
        undefined, // don't forward story reply context usually
        message.type === 'location' ? message.location : (message.type === 'poll' ? message.poll : undefined)
      );
    }
    return true;
  } catch (error) {
    console.error('Failed to forward message:', error);
    return false;
  }
};

export const fetchChatMedia = async (conversationId: string): Promise<Message[]> => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    where('type', 'in', ['image', 'snap']),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
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
  limitCount: number = 30,
  onNewMessage?: (message: Message) => void
) => {
  if (!userId1 || !userId2 || !auth.currentUser) return () => {};

  const conversationId = [userId1, userId2].sort().join('_');
  const messagesRef = collection(db, 'messages');
  
  // Added orderBy and limit for performance
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Message;
      messages.push({ ...data, id: docSnap.id });
    });
    
    // Sort ascending for UI (after fetching desc batch)
    messages.sort((a, b) => {
      const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : Date.now());
      const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : Date.now());
      return t1 - t2;
    });

    // Check for new messages from the other user
    if (messages.length > 0 && onNewMessage) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== userId1 && lastMessage.senderId !== userId2) {
        // This shouldn't happen, but just in case
      } else {
        const otherUserId = lastMessage.senderId === userId1 ? userId2 : userId1;
        if (lastMessage.senderId === otherUserId) {
          onNewMessage(lastMessage);
        }
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
  if (!userId || !auth.currentUser) return () => {};

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
    status: 'read',
    readAt: serverTimestamp() 
  });
};

export const markAsReceived = async (messageId: string) => {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, { 
    received: true,
    status: 'delivered'
  });
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
  if (!userId || !auth.currentUser) return () => {};

  const secretRef = collection(db, 'secretConversations');
  const q = query(secretRef, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const ids: string[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.isSecret !== false) {
          ids.push(data.partnerId);
      }
    });
    callback(ids);
  }, (error) => {
    console.warn('Snapshot error in subscribeToSecretConversations:', error.message);
  });
};

export const deleteMessageForEveryone = async (messageId: string) => {
  try {
    const msgRef = doc(db, 'messages', messageId);
    await updateDoc(msgRef, {
      isDeleted: true,
      text: '🚫 This message was deleted',
      type: 'text',
      poll: deleteField(),
      location: deleteField(),
      reactions: deleteField(),
      replyTo: deleteField(),
      storyReply: deleteField(),
      duration: deleteField(),
      timer: deleteField(),
      filter: deleteField(),
    });
  } catch (error) {
    console.error('Failed to delete for everyone:', error);
  }
};

export const deleteMessageForMe = async (messageId: string, userId: string) => {
  try {
    const msgRef = doc(db, 'messages', messageId);
    await updateDoc(msgRef, {
      deletedBy: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Failed to delete for me:', error);
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
    const msgRef = doc(db, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
};

// Mood Status logic
export const setUserMood = async (userId: string, mood: string, emoji: string) => {
  const userRef = doc(db, 'users', userId);
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 2); // 2 hour duration
  
  await updateDoc(userRef, {
    moodStatus: {
      text: mood,
      emoji: emoji,
      expiresAt: expiry
    }
  });
};

export const clearUserMood = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    moodStatus: deleteField()
  });
};

export const voteInPoll = async (messageId: string, optionIndex: number, userId: string) => {
  const msgRef = doc(db, 'messages', messageId);
  await updateDoc(msgRef, {
    [`poll.votes.${userId}`]: optionIndex
  });
};
