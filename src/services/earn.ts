import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface WalletData {
  balance: number;
  dailyCoinsEarned: number;
  lastResetDate: string; // YYYY-MM-DD
  monthlyCoinsEarned?: number;
  lastMonthStr?: string; // YYYY-MM
  lastLoginDate?: string; // YYYY-MM-DD
  lastAdDate?: string; // YYYY-MM-DD
}

export interface Transaction {
  id?: string;
  amount: number;
  type: 'earn' | 'withdraw';
  source: string;
  timestamp: any;
  status: 'completed' | 'pending' | 'failed';
}

export const DAILY_LIMIT = 30;
export const MONTHLY_LIMIT = 900;
export const MIN_WITHDRAWAL = 300;

export const initializeWallet = async (uid: string) => {
  const walletRef = doc(db, 'users', uid, 'wallet', 'data');
  const walletSnap = await getDoc(walletRef);
  
  if (!walletSnap.exists()) {
    const initialData: WalletData = {
      balance: 0,
      dailyCoinsEarned: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      monthlyCoinsEarned: 0,
      lastMonthStr: new Date().toISOString().slice(0, 7)
    };
    await setDoc(walletRef, initialData);
    return initialData;
  }
  return walletSnap.data() as WalletData;
};

export const getWalletData = async (uid: string): Promise<WalletData | null> => {
   const walletRef = doc(db, 'users', uid, 'wallet', 'data');
   const walletSnap = await getDoc(walletRef);
   if (walletSnap.exists()) {
      return walletSnap.data() as WalletData;
   }
   return null;
}

export const getTransactions = async (uid: string): Promise<Transaction[]> => {
  const txRef = collection(db, 'users', uid, 'transactions');
  const q = query(txRef, orderBy('timestamp', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Transaction[];
};

export const addCoins = async (uid: string, amount: number, source: string): Promise<{ success: boolean, message: string }> => {
  const walletRef = doc(db, 'users', uid, 'wallet', 'data');
  const txRef = collection(db, 'users', uid, 'transactions');
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  try {
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      
      let currentData: WalletData;
      if (!walletDoc.exists()) {
        currentData = { balance: 0, dailyCoinsEarned: 0, lastResetDate: today, monthlyCoinsEarned: 0, lastMonthStr: thisMonth };
      } else {
        currentData = { monthlyCoinsEarned: 0, lastMonthStr: thisMonth, ...walletDoc.data() } as WalletData;
      }

      // Reset daily limit if it's a new day
      if (currentData.lastResetDate !== today) {
        currentData.dailyCoinsEarned = 0;
        currentData.lastResetDate = today;
      }

      // Reset monthly limit if it's a new month
      if (currentData.lastMonthStr !== thisMonth) {
        currentData.monthlyCoinsEarned = 0;
        currentData.lastMonthStr = thisMonth;
      }

      // TASK ABUSE PREVENTION CHECK
      if (source === 'Daily Login' && currentData.lastLoginDate === today) {
        throw new Error('You have already claimed your daily check-in reward today.');
      }
      if (source === 'Watched Video Ad' && currentData.lastAdDate === today) {
        throw new Error('You have already claimed your ad reward today.');
      }

      // Check daily limit
      if (currentData.dailyCoinsEarned + amount > DAILY_LIMIT) {
        throw new Error(`Daily limit exceeded (Max ${DAILY_LIMIT} coins/day)`);
      }

      // Check monthly limit
      if ((currentData.monthlyCoinsEarned || 0) + amount > MONTHLY_LIMIT) {
        throw new Error(`Monthly limit exceeded (Max ${MONTHLY_LIMIT} coins/month)`);
      }

      // Update wallet data
      const newBalance = currentData.balance + amount;
      const newDailyEarned = currentData.dailyCoinsEarned + amount;
      const newMonthlyEarned = (currentData.monthlyCoinsEarned || 0) + amount;

      const updateData: any = {
        balance: newBalance,
        dailyCoinsEarned: newDailyEarned,
        lastResetDate: today,
        monthlyCoinsEarned: newMonthlyEarned,
        lastMonthStr: thisMonth
      };

      // Set task completion dates
      if (source === 'Daily Login') updateData.lastLoginDate = today;
      if (source === 'Watched Video Ad') updateData.lastAdDate = today;

      transaction.set(walletRef, updateData, { merge: true });

      // Add transaction record
      const newTxRef = doc(txRef);
      transaction.set(newTxRef, {
        amount,
        type: 'earn',
        source,
        timestamp: serverTimestamp(),
        status: 'completed'
      });
    });

    return { success: true, message: `Earned ${amount} coins!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const addReferralReward = async (referrerId: string, referralName: string) => {
  const amount = 30;
  const source = `Referral Reward: ${referralName}`;
  const walletRef = doc(db, 'users', referrerId, 'wallet', 'data');
  const txRef = collection(db, 'users', referrerId, 'transactions');
  const userRef = doc(db, 'users', referrerId);

  try {
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) return;

      let currentBalance = 0;
      if (walletDoc.exists()) {
        currentBalance = walletDoc.data().balance || 0;
      }

      // Update wallet
      transaction.set(walletRef, { 
        balance: currentBalance + amount 
      }, { merge: true });

      // Update user document points/referralCount
      transaction.update(userRef, {
        points: (userDoc.data().points || 0) + amount,
        referralCount: (userDoc.data().referralCount || 0) + 1
      });

      // Add transaction
      const newTxRef = doc(txRef);
      transaction.set(newTxRef, {
        amount,
        type: 'earn',
        source,
        timestamp: serverTimestamp(),
        status: 'completed'
      });
    });
  } catch (error) {
    console.error('Referral Reward Error:', error);
  }
};

export const requestWithdrawal = async (uid: string, amount: number, method: string, accountDetails: string): Promise<{ success: boolean, message: string }> => {
  const walletRef = doc(db, 'users', uid, 'wallet', 'data');
  const txRef = collection(db, 'users', uid, 'transactions');

  try {
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      
      if (!walletDoc.exists()) {
        throw new Error('Wallet not found');
      }

      const currentData = walletDoc.data() as WalletData;
      
      if (amount < MIN_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL} coins (${MIN_WITHDRAWAL / 30} PKR).`);
      }

      if (currentData.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct balance
      transaction.update(walletRef, {
        balance: currentData.balance - amount
      });

      // Add pending withdraw transaction to user scope
      const newTxRef = doc(txRef);
      const txData = {
        amount: -amount,
        type: 'withdraw',
        source: `Withdrawal via ${method}`,
        accountDetails,
        timestamp: serverTimestamp(),
        status: 'pending'
      };
      transaction.set(newTxRef, txData);

      // Add to global admin collection
      const globalWithdrawalRef = doc(collection(db, 'withdrawals'), newTxRef.id);
      transaction.set(globalWithdrawalRef, {
         uid,
         transactionId: newTxRef.id,
         amount,
         method,
         accountDetails,
         status: 'pending',
         timestamp: serverTimestamp(),
      });
    });

    return { success: true, message: 'Withdrawal requested successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
