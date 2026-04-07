import { collection, query, where, orderBy, getDocs, doc, runTransaction, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface AdminWithdrawal {
  id: string;
  uid: string;
  transactionId: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: any;
  userDisplayName?: string; // We can fetch this for UI if needed
}

export const getPendingWithdrawals = async (): Promise<AdminWithdrawal[]> => {
  const withdrawalsRef = collection(db, 'withdrawals');
  // Removed orderBy to prevent composite index requirement. We will sort locally.
  const q = query(withdrawalsRef, where('status', '==', 'pending')); 
  
  const snapshot = await getDocs(q);
  let requests: AdminWithdrawal[] = [];

  for (const item of snapshot.docs) {
     const data = item.data();
     const userDoc = await getDoc(doc(db, 'users', data.uid));
     const userData = userDoc.exists() ? userDoc.data() : {};
     
     requests.push({
        id: item.id,
        uid: data.uid,
        transactionId: data.transactionId,
        amount: data.amount,
        method: data.method,
        accountDetails: data.accountDetails,
        status: data.status,
        timestamp: data.timestamp,
        userDisplayName: userData.displayName || 'Unknown User'
     } as AdminWithdrawal);
  }
  
  // Sort requests locally by timestamp ascending
  requests.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return timeA - timeB;
  });

  return requests;
};

export const fulfillWithdrawal = async (uid: string, transactionId: string, withdrawalId: string): Promise<{success: boolean, message: string}> => {
  try {
     const globalWithdrawalRef = doc(db, 'withdrawals', withdrawalId);
     const userTxRef = doc(db, 'users', uid, 'transactions', transactionId);

     await runTransaction(db, async (transaction) => {
        const globalDoc = await transaction.get(globalWithdrawalRef);
        if (!globalDoc.exists()) {
           throw new Error('Withdrawal request not found.');
        }
        if (globalDoc.data().status !== 'pending') {
           throw new Error('Already processed.');
        }

        // Mark as completed
        transaction.update(globalWithdrawalRef, { status: 'completed' });
        transaction.update(userTxRef, { status: 'completed' });
     });

     return { success: true, message: 'Withdrawal fulfilled successfully.' };
  } catch (error: any) {
     return { success: false, message: error.message };
  }
};
