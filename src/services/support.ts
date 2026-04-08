import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

export type SupportRequestStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface SupportRequest {
  id: string;
  uid: string;
  displayName: string;
  phoneNumber?: string;
  contact?: string;
  title: string;
  message: string;
  status: SupportRequestStatus;
  response?: string;
  respondedAt?: any;
  createdAt: any;
}

export const submitSupportRequest = async (request: Omit<SupportRequest, 'id' | 'status' | 'createdAt'>) => {
  const supportRef = collection(db, 'supportRequests');
  const payload: Record<string, any> = {
    uid: request.uid,
    displayName: request.displayName,
    title: request.title,
    message: request.message,
    status: 'open',
    createdAt: Timestamp.now(),
  };

  if (request.phoneNumber) payload.phoneNumber = request.phoneNumber;
  if (request.contact) payload.contact = request.contact;
  if (request.response) payload.response = request.response;

  const docRef = await addDoc(supportRef, payload);
  return docRef.id;
};

export const listenUserSupportRequests = (uid: string, callback: (requests: SupportRequest[]) => void) => {
  const supportRef = collection(db, 'supportRequests');
  const q = query(supportRef, where('uid', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const requests: SupportRequest[] = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<SupportRequest, 'id'>),
    })).sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    callback(requests);
  });
};

export const listenAllSupportRequests = (callback: (requests: SupportRequest[]) => void) => {
  const supportRef = collection(db, 'supportRequests');
  const q = query(supportRef);
  return onSnapshot(q, (snapshot) => {
    const requests: SupportRequest[] = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<SupportRequest, 'id'>),
    })).sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    callback(requests);
  });
};

export const respondToSupportRequest = async (
  requestId: string,
  response: string,
  status: SupportRequestStatus = 'resolved'
) => {
  const requestRef = doc(db, 'supportRequests', requestId);
  await updateDoc(requestRef, {
    response,
    status,
    respondedAt: Timestamp.now(),
  });
};
