// Run this ONCE to set the admin password in Firestore
// Usage: node setup_admin.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Copy your firebase config from firebaseConfig.ts
const firebaseConfig = {
  apiKey: "AIzaSyDyX4Xmcp4qsKhQ0-3pu4QkF-oJbqMedCY",
  authDomain: "chatsnap-aa8c7.firebaseapp.com",
  databaseURL: "https://chatsnap-aa8c7-default-rtdb.firebaseio.com",
  projectId: "chatsnap-aa8c7",
  storageBucket: "chatsnap-aa8c7.appspot.com",
  messagingSenderId: "890504550859",
  appId: "1:890504550859:web:4a3c5bfc18321261047e4e",
  measurementId: "G-M0PSJ86C8V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupAdmin() {
  await setDoc(doc(db, 'config', 'admin'), {
    password: 'MohsinAbbas.9925'  // Change this to whatever you want
  });
  console.log('✅ Admin password saved to Firestore (config/admin)');
  process.exit(0);
}

setupAdmin();
