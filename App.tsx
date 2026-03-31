import "./global.css";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './src/store';
import { setUser, logout } from './src/store/authSlice';
import { restoreTheme } from './src/store/themeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, LogBox } from 'react-native';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from './src/services/firebaseConfig';
import { requestNotificationPermissions, setupNotificationListeners } from './src/services/notifications';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacySettingsScreen from './src/screens/PrivacySettingsScreen';

import QRProfileScreen from './src/screens/QRProfileScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';

import LandingScreen from './src/screens/LandingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SplashScreen from './src/screens/SplashScreen';

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const [isReady, setIsReady] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const dispatch = useDispatch();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Restore user session from storage for instant login
    const restoreUserSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          dispatch(setUser(userData));
        }
      } catch (e) {
        console.error('Failed to restore session', e);
      }
    };
    restoreUserSession();

    const setupNotifications = async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        console.log('Notification permissions granted');
      }
    };

    setupNotifications();

    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap to navigate to chat
      }
    );

    return cleanup;
  }, []);

  useEffect(() => {
    if (!isReady || !navigationRef.current) return;
    
    const currentRoute = navigationRef.current.getCurrentRoute();
    const targetRoute = !auth.uid ? "Landing" : (auth.isNewUser && !auth.displayName ? "ProfileSetup" : "Home");

    // Splash navigation after delay
    if (currentRoute?.name === 'Splash') {
      const timeout = setTimeout(() => {
        navigationRef.current?.navigate(targetRoute as never);
      }, 2500);
      return () => clearTimeout(timeout);
    }

    // Handle logout: if not authenticated and not on an auth screen, go to Landing
    const authScreens = ['Landing', 'Login', 'Register', 'OTP', 'Splash'];
    if (!auth.uid && !authScreens.includes(currentRoute?.name || '')) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Landing' as never }],
      });
    }

    // Handle login: if authenticated and we're currently on an auth screen (excluding OTP/ProfileSetup logic)
    if (auth.uid && authScreens.includes(currentRoute?.name || '') && currentRoute?.name !== 'Splash') {
       navigationRef.current.reset({
        index: 0,
        routes: [{ name: targetRoute as never }],
      });
    }

  }, [auth.uid, auth.isNewUser, auth.displayName, isReady]);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [firebaseUser, setFirebaseUser] = useState(firebaseAuth.currentUser);
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        // If Redux is empty or doesn't match the authenticated user, restore from Firestore
        if (auth.uid !== user.uid) {
           try {
             const userDoc = await getDoc(doc(db, 'users', user.uid));
             if (userDoc.exists()) {
               const userData = userDoc.data();
               dispatch(setUser({
                 uid: user.uid,
                 phoneNumber: userData.phoneNumber,
                 displayName: userData.displayName,
                 photoURL: userData.photoURL,
                 isNewUser: userData.isNewUser || false,
               }));
             }
           } catch (e) {
             console.error('Session sync failed', e);
           }
        }
      } else {
        // If no user in Firebase and we think we're authenticated, log out
        if (auth.uid) {
           dispatch(logout());
        }
      }
    });
    return unsubscribe;
  }, [auth.uid]);

  useEffect(() => {
    if (!auth.uid || !firebaseUser) return;

    const updateStatus = async (status: 'online' | 'offline') => {
      try {
        if (!isMounted.current && status === 'online') return;
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          status,
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.error('Status update failed', e);
      }
    };

    updateStatus(AppState.currentState === 'active' ? 'online' : 'offline');

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      updateStatus(nextAppState === 'active' ? 'online' : 'offline');
    });

    return () => {
      subscription.remove();
      updateStatus('offline');
    };
  }, [auth.uid, firebaseUser]);

  const MyTheme = useMemo(() => ({
    dark: false,
    colors: {
      primary: primaryColor,
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#1A1C1E',
      border: 'rgba(73,99,255,0.1)',
      notification: primaryColor,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    }
  }), [primaryColor]);

  return (
    <NavigationContainer 
      ref={navigationRef} 
      theme={MyTheme}
      onReady={() => setIsReady(true)}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="QRProfile" component={QRProfileScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Navigation />
      </SafeAreaProvider>
    </Provider>
  );
}
