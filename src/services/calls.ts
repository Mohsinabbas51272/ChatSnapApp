import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  getDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName?: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  timestamp: any;
  channelName: string;
}

export const initiateCall = async (
  callerId: string, 
  callerName: string, 
  receiverId: string, 
  receiverName: string,
  type: 'voice' | 'video'
) => {
  try {
    const channelName = `call_${callerId}_${Date.now()}`;
    const callData = {
      callerId,
      callerName,
      receiverId,
      receiverName,
      type,
      status: 'ringing',
      channelName,
      timestamp: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'calls'), callData);
    return docRef.id;
  } catch (error) {
    console.error('Failed to initiate call:', error);
    return null;
  }
};

export const respondToCall = async (callId: string, status: 'accepted' | 'rejected') => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status });
    return true;
  } catch (error) {
    console.error('Failed to respond to call:', error);
    return false;
  }
};

export const endCall = async (callId: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status: 'ended' });
    // Optional: Delete the call doc after a delay or move to history
    return true;
  } catch (error) {
    console.error('Failed to end call:', error);
    return false;
  }
};

export const subscribeToCall = (callId: string, callback: (call: Call) => void) => {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Call);
    }
  });
};

export const subscribeToIncomingCalls = (userId: string, callback: (call: Call) => void) => {
  const q = query(
    collection(db, 'calls'), 
    where('receiverId', '==', userId), 
    where('status', '==', 'ringing')
  );
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback({ id: change.doc.id, ...change.doc.data() } as Call);
      }
    });
  });
};
