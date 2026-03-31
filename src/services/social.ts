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

  return onSnapshot(q, (snapshot) => {
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ ...(doc.data() as FriendRequest), id: doc.id });
    });
    callback(requests);
  }, (error) => {
    console.warn('Snapshot error in subscribeToFriendRequests:', error.message);
  });
};

// Get friends list
export const subscribeToFriends = (userId: string, callback: (friendIds: string[]) => void) => {
  const friendsRef = collection(db, 'friends');
  const q = query(friendsRef, where('uids', 'array-contains', userId));

  return onSnapshot(q, (snapshot) => {
    const friendIds: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const friendId = data.uids.find((id: string) => id !== userId);
      if (friendId) friendIds.push(friendId);
    });
    callback(friendIds);
  }, (error) => {
    console.warn('Snapshot error in subscribeToFriends:', error.message);
  });
};

// Subscribe to outgoing friend requests
export const subscribeToSentRequests = (userId: string, callback: (requestedIds: string[]) => void) => {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(requestsRef, where('fromId', '==', userId), where('status', '==', 'pending'));

  return onSnapshot(q, (snapshot) => {
    const requestedIds: string[] = [];
    snapshot.forEach((doc) => {
      requestedIds.push(doc.data().toId);
    });
    callback(requestedIds);
  }, (error) => {
    console.warn('Snapshot error in subscribeToSentRequests:', error.message);
  });
};
