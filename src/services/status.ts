import { db } from './firebaseConfig';
import { doc, updateDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export const updateUserStatus = async (userId: string, status: 'online' | 'offline') => {
  const userRef = doc(db, 'users', userId);
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
