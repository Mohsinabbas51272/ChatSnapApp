import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// User's actual Firebase configuration
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = null;

export default app;
