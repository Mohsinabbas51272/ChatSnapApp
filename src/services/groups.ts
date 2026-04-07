import { db, auth } from './firebaseConfig';
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp,
  doc, updateDoc, getDoc, getDocs, arrayUnion, arrayRemove, deleteDoc, limit
} from 'firebase/firestore';

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  adminId: string;
  photoURL?: string;
  createdAt: any;
}

export interface GroupMessage {
  id?: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'snap' | 'voice' | 'document' | 'poll';
  poll?: { question: string; options: string[]; votes: { [uid: string]: number } };
  timestamp: any;
}

// Create a new group
export const createGroup = async (name: string, memberIds: string[]) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const allMembers = [...new Set([currentUser.uid, ...memberIds])];

  const docRef = await addDoc(collection(db, 'groups'), {
    name,
    memberIds: allMembers,
    adminId: currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Subscribe to groups the user is a member of
export const subscribeToGroups = (userId: string, callback: (groups: Group[]) => void) => {
  if (!userId || !auth.currentUser) return () => {};

  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      groups.push({ ...(doc.data() as Group), id: doc.id });
    });
    callback(groups);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Groups sync error:', error.message);
  });
};

// Delete a group message
export const deleteGroupMessage = async (messageId: string) => {
  if (!messageId) return;
  const messageRef = doc(db, 'groupMessages', messageId);
  await deleteDoc(messageRef);
};

// Send a message to a group
export const sendGroupMessage = async (
  groupId: string, 
  text: string, 
  senderName: string, 
  type: 'text' | 'image' | 'snap' | 'voice' | 'document' | 'poll' | 'location' = 'text',
  extras?: any
) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  await addDoc(collection(db, 'groupMessages'), {
    groupId,
    senderId: currentUser.uid,
    senderName,
    text,
    type,
    timestamp: serverTimestamp(),
    ...(type === 'poll' ? { poll: { ...extras, votes: {} } } : {}),
    ...(type === 'location' ? { location: extras } : {}),
  });
};

// Subscribe to group messages
export const subscribeToGroupMessages = (groupId: string, callback: (messages: GroupMessage[]) => void) => {
  if (!groupId || !auth.currentUser) return () => {};

  const q = query(collection(db, 'groupMessages'), where('groupId', '==', groupId));
  return onSnapshot(q, (snapshot) => {
    const messages: GroupMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({ ...(doc.data() as GroupMessage), id: doc.id });
    });
    messages.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return aTime - bTime;
    });
    callback(messages);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Group messages sync error:', error.message);
  });
};

// Add member to group
export const addGroupMember = async (groupId: string, memberId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, { memberIds: arrayUnion(memberId) });
};

// Remove member from group
export const removeGroupMember = async (groupId: string, memberId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, { memberIds: arrayRemove(memberId) });
};

// Get mutual friends between two users
export const getMutualFriends = async (userId1: string, userId2: string): Promise<string[]> => {
  const friendsRef = collection(db, 'friends');
  
  const q1 = query(friendsRef, where('uids', 'array-contains', userId1));
  const snap1 = await getDocs(q1);
  const friends1 = new Set<string>();
  snap1.forEach(d => {
    const other = d.data().uids.find((id: string) => id !== userId1);
    if (other) friends1.add(other);
  });

  const q2 = query(friendsRef, where('uids', 'array-contains', userId2));
  const snap2 = await getDocs(q2);
  const mutual: string[] = [];
  snap2.forEach(d => {
    const other = d.data().uids.find((id: string) => id !== userId2);
    if (other && friends1.has(other)) mutual.push(other);
  });

  return mutual;
};

// Subscribe to group conversations (latest message from each group)
export const subscribeToGroupConversations = (userId: string, callback: (conversations: any[]) => void) => {
  if (!userId || !auth.currentUser) return () => {};

  const groupsQuery = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  const innerUnsubscribers: (() => void)[] = [];

  const outerUnsub = onSnapshot(groupsQuery, (snapshot) => {
    // Clean up previous inner listeners
    innerUnsubscribers.forEach(unsub => unsub());
    innerUnsubscribers.length = 0;

    const groupConversations: any[] = [];
    
    if (snapshot.docs.length === 0) {
      callback([]);
      return;
    }

    snapshot.docs.forEach(groupDoc => {
      const gData = groupDoc.data();
      const msgQuery = query(
        collection(db, 'groupMessages'),
        where('groupId', '==', groupDoc.id),
        limit(1)
      );

      const innerUnsub = onSnapshot(msgQuery, (msgSnap) => {
        const lastMsg = msgSnap.docs[0]?.data();
        const conv = {
          id: groupDoc.id,
          isGroup: true,
          group: { id: groupDoc.id, ...gData },
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            timestamp: lastMsg.timestamp?.toDate() || new Date(),
            type: lastMsg.type || 'text',
            senderName: lastMsg.senderName,
          } : {
            text: 'No messages yet',
            timestamp: gData.createdAt?.toDate() || new Date(),
            type: 'text',
          },
          unreadCount: 0,
          partnerId: groupDoc.id
        };

        const existingIdx = groupConversations.findIndex(c => c.id === conv.id);
        if (existingIdx >= 0) {
          groupConversations[existingIdx] = conv;
        } else {
          groupConversations.push(conv);
        }
        
        callback([...groupConversations]);
      }, (error) => {
        if (error.code === 'permission-denied') return;
        console.warn('Group conversation msg sync error:', error.message);
      });
      innerUnsubscribers.push(innerUnsub);
    });
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Group conversations sync error:', error.message);
  });

  return () => {
    outerUnsub();
    innerUnsubscribers.forEach(unsub => unsub());
  };
};

export const voteInGroupPoll = async (messageId: string, optionIndex: number, userId: string) => {
  const msgRef = doc(db, 'groupMessages', messageId);
  await updateDoc(msgRef, {
    [`poll.votes.${userId}`]: optionIndex
  });
};
