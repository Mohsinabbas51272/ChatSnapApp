import "./global.css";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useSelector, useDispatch, useStore } from 'react-redux';
import { store, RootState } from './src/store';
import { setUser, logout } from './src/store/authSlice';
import { restoreTheme } from './src/store/themeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

// Firebase imports
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
import { RootStackParamList } from './src/types/navigation';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications', 'Non-serializable values']);

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main Content Component: Handles screen switching based on auth state.
 * Memoized to prevent re-renders when parent is reconciled (e.g., keyboard opening).
 */
const MainNavigator = React.memo(() => {
    const auth = useSelector((state: RootState) => state.auth);
    const [isSplashDone, setIsSplashDone] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsSplashDone(true), 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isSplashDone ? (
                <Stack.Screen name="Splash" component={SplashScreen} />
            ) : !auth.uid ? (
                <>
                    <Stack.Screen name="Landing" component={LandingScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="OTP" component={OTPScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="Chat" component={ChatScreen} />
                    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="QRProfile" component={QRProfileScreen} />
                    <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                </>
            )}
        </Stack.Navigator>
    );
});

/**
 * Background Logic: Handles side effects like listeners and theme sync.
 * This runs inside NavigationContainer but doesn't render anything itself.
 */
const BackgroundLogic = () => {
    const auth = useSelector((state: RootState) => state.auth);
    const { isDarkMode } = useSelector((state: RootState) => state.theme);
    const { setColorScheme } = useColorScheme();
    const dispatch = useDispatch();

    useEffect(() => {
        const init = async () => {
            const saved = await AsyncStorage.getItem('user');
            if (saved) dispatch(setUser(JSON.parse(saved)));

            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme) {
                try {
                    dispatch(restoreTheme(JSON.parse(savedTheme)));
                } catch (e) {}
            }
            
            const granted = await requestNotificationPermissions();
            if (granted) setupNotificationListeners(() => {}, () => {});
        };
        init();

        const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        dispatch(setUser({ uid: user.uid, phoneNumber: data.phoneNumber || null, ...data }));
                    }
                } catch (e) {}
            } else {
                dispatch(logout());
            }
        });

        return unsub;
    }, []);

    useEffect(() => {
        setColorScheme(isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    useEffect(() => {
        if (!auth?.uid) return;
        const updateStatus = async (status: 'online' | 'offline') => {
            try {
                const userRef = doc(db, 'users', auth.uid!);
                await setDoc(userRef, { status, lastSeen: serverTimestamp() }, { merge: true });
            } catch (e: any) {}
        };
        const sub = AppState.addEventListener('change', (next) => updateStatus(next === 'active' ? 'online' : 'offline'));
        updateStatus('online');
        return () => { sub.remove(); updateStatus('offline'); };
    }, [auth.uid]);

    return null;
};

/**
 * Root Component: Provides stable NavigationContainer.
 */
const RootNavigator = () => {
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);

    const MyTheme = useMemo(() => ({
        dark: isDarkMode,
        colors: {
            ...DefaultTheme.colors,
            primary: primaryColor,
            background: isDarkMode ? '#101419' : '#FFFFFF',
            card: isDarkMode ? '#181C24' : '#FFFFFF',
            text: isDarkMode ? '#E2E8F0' : '#1A1C1E',
            border: 'transparent',
            notification: primaryColor,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' as const },
          medium: { fontFamily: 'System', fontWeight: '500' as const },
          bold: { fontFamily: 'System', fontWeight: '700' as const },
          heavy: { fontFamily: 'System', fontWeight: '900' as const },
        }
    }), [primaryColor, isDarkMode]);

    return (
        <NavigationContainer theme={MyTheme as any}>
            <BackgroundLogic />
            <MainNavigator />
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <RootNavigator />
            </SafeAreaProvider>
        </Provider>
    );
}
