import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// @ts-ignore - getReactNativePersistence exists at runtime in RN but not in TS types
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

// Prevent duplicate initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with React Native persistence, falling back to getAuth on hot reload
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e: any) {
  // auth/already-initialized happens on hot reload - just reuse existing
  auth = getAuth(app);
}

const db = getFirestore(app);
export { auth, db };
export default app;
