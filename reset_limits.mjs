// One-time script to reset daily & monthly limits for ALL users' wallets
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDyX4Xmcp4qsKhQ0-3pu4QkF-oJbqMedCY",
  authDomain: "chatsnap-aa8c7.firebaseapp.com",
  projectId: "chatsnap-aa8c7",
  storageBucket: "chatsnap-aa8c7.appspot.com",
  messagingSenderId: "890504550859",
  appId: "1:890504550859:web:4a3c5bfc18321261047e4e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetLimits() {
  // Get all users
  const usersSnap = await getDocs(collection(db, "users"));
  let count = 0;
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const walletRef = doc(db, "users", uid, "wallet", "data");
    try {
      await updateDoc(walletRef, {
        dailyCoinsEarned: 0,
        lastResetDate: today,
        monthlyCoinsEarned: 0,
        lastMonthStr: thisMonth,
      });
      console.log(`✅ Reset limits for user: ${uid}`);
      count++;
    } catch (e) {
      // Wallet doc may not exist for some users
      console.log(`⏭️  Skipped user (no wallet): ${uid}`);
    }
  }
  console.log(`\nDone! Reset ${count} user(s).`);
  process.exit(0);
}

resetLimits();
