import { db, auth } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  deleteDoc,
  or,
  and,
  setDoc,
  getDoc
} from 'firebase/firestore';

export interface FriendRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  senderName: string;
  senderPhoto?: string;
  timestamp: any;
}

// Send a friend request
export const sendFriendRequest = async (toId: string, senderName: string, senderPhoto?: string, source: 'contact' | 'search' = 'search') => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Check if already sent or already friends
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef, 
    or(
        and(where('fromId', '==', currentUser.uid), where('toId', '==', toId)),
        and(where('fromId', '==', toId), where('toId', '==', currentUser.uid))
    )
  );
  
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('A request already exists or you are already friends.');
  }

  await addDoc(requestsRef, {
    fromId: currentUser.uid,
    toId,
    status: 'pending',
    senderName,
    senderPhoto: senderPhoto || null,
    source,
    timestamp: serverTimestamp(),
  });
};

// Respond to friend request (Accepted/Declined)
export const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'declined') => {
  const requestRef = doc(db, 'friendRequests', requestId);
  
  if (status === 'accepted') {
    const snap = await getDoc(requestRef);
    if (snap.exists()) {
      const data = snap.data();
      // Add to friends collection for bidirectional link
      const friendPairId = [data.fromId, data.toId].sort().join('_');
      await setDoc(doc(db, 'friends', friendPairId), {
        uids: [data.fromId, data.toId],
        timestamp: serverTimestamp(),
      });
    }
    await updateDoc(requestRef, { status: 'accepted' });
  } else {
    await deleteDoc(requestRef);
  }
};

// Subscribe to incoming friend requests
export const subscribeToFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(requestsRef, where('toId', '==', userId), where('status', '==', 'pending'));

  // Safety check: Don't start subscription if no user
  if (!userId || !auth.currentUser) return () => {};

  return onSnapshot(q, (snapshot) => {
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ ...(doc.data() as FriendRequest), id: doc.id });
    });
    callback(requests);
  }, (error) => {
    // Silence common permission errors during auth transitions
    if (error.code === 'permission-denied') return;
    console.warn('FriendRequests sync error:', error.message);
  });
};

// Get friends list
export const subscribeToFriends = (userId: string, callback: (friendIds: string[]) => void) => {
  const friendsRef = collection(db, 'friends');
  const q = query(friendsRef, where('uids', 'array-contains', userId));

  // Safety check: Don't start subscription if no user
  if (!userId || !auth.currentUser) return () => {};

  return onSnapshot(q, (snapshot) => {
    const friendIds: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const friendId = data.uids.find((id: string) => id !== userId);
      if (friendId) friendIds.push(friendId);
    });
    callback(friendIds);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Friends sync error:', error.message);
  });
};

// Subscribe to outgoing friend requests
export const subscribeToSentRequests = (userId: string, callback: (requestedIds: string[]) => void) => {
  if (!userId || !auth.currentUser) return () => {};

  const requestsRef = collection(db, 'friendRequests');
  const q = query(requestsRef, where('fromId', '==', userId), where('status', '==', 'pending'));

  return onSnapshot(q, (snapshot) => {
    const requestedIds: string[] = [];
    snapshot.forEach((doc) => {
      requestedIds.push(doc.data().toId);
    });
    callback(requestedIds);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Snapshot error in subscribeToSentRequests:', error.message);
  });
};
// Blocking System
export const blockUser = async (toBlockId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const blockRef = doc(db, 'blocks', `${currentUser.uid}_${toBlockId}`);
  await setDoc(blockRef, {
    blockerId: currentUser.uid,
    blockedId: toBlockId,
    timestamp: serverTimestamp(),
  });
};

export const unblockUser = async (toUnblockId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const blockRef = doc(db, 'blocks', `${currentUser.uid}_${toUnblockId}`);
  await deleteDoc(blockRef);
};

export const subscribeToBlockedUsers = (userId: string, callback: (blockedIds: string[]) => void) => {
  if (!userId || !auth.currentUser) return () => {};

  const blocksRef = collection(db, 'blocks');
  const q = query(blocksRef, where('blockerId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const blockedIds: string[] = [];
    snapshot.forEach((doc) => {
      blockedIds.push(doc.data().blockedId);
    });
    callback(blockedIds);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Blocked users sync error:', error.message);
  });
};

export const subscribeToWhoBlockedMe = (userId: string, callback: (blockerIds: string[]) => void) => {
  if (!userId || !auth.currentUser) return () => {};

  const blocksRef = collection(db, 'blocks');
  const q = query(blocksRef, where('blockedId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const blockerIds: string[] = [];
    snapshot.forEach((doc) => {
      blockerIds.push(doc.data().blockerId);
    });
    callback(blockerIds);
  }, (error) => {
    if (error.code === 'permission-denied') return;
    console.warn('Who blocked me sync error:', error.message);
  });
};

// Unfriend a user (Bidirectional removal)
export const unfriend = async (friendId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Delete from friends collection
  const friendPairId = [currentUser.uid, friendId].sort().join('_');
  await deleteDoc(doc(db, 'friends', friendPairId));

  // Also cleanup any existing accepted requests (to prevent ghosting)
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef, 
    or(
        and(where('fromId', '==', currentUser.uid), where('toId', '==', friendId)),
        and(where('fromId', '==', friendId), where('toId', '==', currentUser.uid))
    )
  );

  const existing = await getDocs(q);
  existing.forEach(async (d) => {
    await deleteDoc(doc(db, 'friendRequests', d.id));
  });
};

// Cancel a pending friend request
export const cancelFriendRequest = async (toId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef, 
    where('fromId', '==', currentUser.uid), 
    where('toId', '==', toId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  snapshot.forEach(async (d) => {
    await deleteDoc(doc(db, 'friendRequests', d.id));
  });
};
