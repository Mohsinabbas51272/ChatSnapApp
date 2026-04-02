import { db } from './firebaseConfig';
import { doc, updateDoc, setDoc, serverTimestamp, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';

export const updateUserStatus = async (userId: string, status: 'online' | 'offline', ghostMode: boolean = false) => {
  const userRef = doc(db, 'users', userId);
  
  // If Ghost Mode is on, we don't update status/lastSeen as 'online'
  // But we might want to update it when they go 'offline' 
  if (ghostMode && status === 'online') {
    return; // Don't broadcast online status
  }

  await setDoc(userRef, {
    status,
    lastSeen: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToUserStatus = (userId: string, callback: (status: any) => void) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (doc) => {
    callback(doc.data());
  });
};
