import "./global.css";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
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
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from './src/services/firebaseConfig';
import { requestNotificationPermissions, setupNotificationListeners, getPushToken } from './src/services/notifications';
import { updateUserStatus } from './src/services/status';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CallScreen from './src/screens/CallScreen';
import MediaGalleryScreen from './src/screens/MediaGalleryScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import WallpaperSettingsScreen from './src/screens/WallpaperSettingsScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import PrivacySettingsScreen from './src/screens/PrivacySettingsScreen';
import QRProfileScreen from './src/screens/QRProfileScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import LandingScreen from './src/screens/LandingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SplashScreen from './src/screens/SplashScreen';
import FindFriendsScreen from './src/screens/FindFriendsScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import WalletScreen from './src/screens/WalletScreen';
import AppLockScreen from './src/screens/AppLockScreen';
import { RootStackParamList } from './src/types/navigation';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications', 'Non-serializable values']);
import { subscribeToIncomingCalls } from './src/services/calls';
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Background Logic: Handles side effects like listeners and theme sync.
 */
const BackgroundLogic = () => {
    const auth = useSelector((state: RootState) => state.auth);
    const { isDarkMode } = useSelector((state: RootState) => state.theme);
    const { setColorScheme } = useColorScheme();
    const dispatch = useDispatch();
    const navigation = useNavigation<any>();

    useEffect(() => {
        const init = async () => {
            try {
                const saved = await AsyncStorage.getItem('user');
                if (saved) dispatch(setUser(JSON.parse(saved)));

                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme) {
                    dispatch(restoreTheme(JSON.parse(savedTheme)));
                }
            } catch (e) {}
            
            const granted = await requestNotificationPermissions();
            if (granted) {
                setupNotificationListeners(() => {}, () => {});
                
                // Get and save push token if user is logged in
                if (firebaseAuth.currentUser) {
                    const token = await getPushToken();
                    if (token) {
                        try {
                            await updateDoc(doc(db, 'users', firebaseAuth.currentUser.uid), {
                                pushToken: token
                            });
                        } catch (e) {}
                    }
                }
            }
        };
        init();

        const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // Anonymous auth block: automatically logout if anonymous session detected
                if (user.isAnonymous) {
                    await firebaseAuth.signOut();
                    dispatch(logout());
                    return;
                }
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const userData = { uid: user.uid, phoneNumber: data.phoneNumber || null, ...data };
                        dispatch(setUser(userData));
                        await AsyncStorage.setItem('user', JSON.stringify(userData));
                    }
                } catch (e) {}
            } else {
                dispatch(logout());
                await AsyncStorage.removeItem('user');
            }
        });

        return unsub;
    }, []);

    useEffect(() => {
        setColorScheme(isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    useEffect(() => {
        if (!auth?.uid) return;
        const sub = AppState.addEventListener('change', (next) => {
            updateUserStatus(auth.uid!, next === 'active' ? 'online' : 'offline');
        });
        updateUserStatus(auth.uid!, 'online');

        // Incoming Call Listener
        const unsubCalls = subscribeToIncomingCalls(auth.uid, (call) => {
            navigation.navigate('Call', {
                callId: call.id,
                isIncoming: true,
                partnerName: call.callerName,
                partnerPhotoURL: null, // We'd ideally fetch this
                type: call.type
            });
        });

        return () => { 
            sub.remove(); 
            unsubCalls();
            updateUserStatus(auth.uid!, 'offline'); 
        };
    }, [auth.uid]);

    return null;
};

/**
 * Root Component: Provides stable NavigationContainer and handles UI structure.
 */
const RootApp = () => {
    const auth = useSelector((state: RootState) => state.auth);
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const [isSplashDone, setIsSplashDone] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // Lock app when it goes to background
    useEffect(() => {
        if (!auth.uid || !auth.isAppLockEnabled) {
            setIsLocked(false);
            return;
        }

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'inactive' || nextAppState === 'background') {
                setIsLocked(true);
            }
        });

        return () => subscription.remove();
    }, [auth.uid, auth.isAppLockEnabled]);

    const MyTheme = useMemo(() => ({
        dark: isDarkMode,
        colors: {
            ...DefaultTheme.colors,
            primary: primaryColor,
            background: isDarkMode ? '#101419' : '#FFFFFF',
            card: isDarkMode ? '#181C24' : primaryColor,
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

    useEffect(() => {
        const timer = setTimeout(() => setIsSplashDone(true), 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <NavigationContainer theme={MyTheme as any}>
            <BackgroundLogic />
            {isLocked && auth.isAppLockEnabled && (
                <AppLockScreen onUnlock={() => setIsLocked(false)} />
            )}
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
                        <Stack.Screen name="FindFriends" component={FindFriendsScreen} />
                        <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="QRProfile" component={QRProfileScreen} />
                        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
                        <Stack.Screen name="Wallet" component={WalletScreen} />
                        <Stack.Screen name="Call" component={CallScreen} options={{ animation: 'fade' }} />
                        <Stack.Screen name="MediaGallery" component={MediaGalleryScreen} />
                        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
                        <Stack.Screen name="WallpaperSettings" component={WallpaperSettingsScreen} />
                        <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <SafeAreaProvider>
                    <RootApp />
                </SafeAreaProvider>
            </Provider>
        </GestureHandlerRootView>
    );
}
