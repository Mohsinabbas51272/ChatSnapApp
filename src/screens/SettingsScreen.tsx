import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StatusBar, Modal, Switch, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setAppLock } from '../store/authSlice';
import { RootState } from '../store';
import { User, LogOut, ChevronRight, Bell, Shield, HelpCircle, UserRound, Palette, Sparkles, Smile, Coffee, Heart, Zap, Moon, Edit3, Camera as CameraIcon, Sun, Eye, EyeOff, Lock, Fingerprint, QrCode, X, Copy, Info, Image as ImageIcon, Plus, Trash2 } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Header from '../components/ui/Header';
import { useNavigation } from '@react-navigation/native';
import { setTheme, setMood, toggleDarkMode } from '../store/themeSlice';
import ScreenBackground from '../components/ui/ScreenBackground';
import { subscribeToFriends } from '../services/social';
import { useResponsive } from '../hooks/useResponsive';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { fetchUserHighlights, deleteHighlight, Highlight } from '../services/stories';
import HighlightSelectionModal from '../components/highlights/HighlightSelectionModal';
import HighlightsViewer from '../components/highlights/HighlightsViewer';
import { isLightColor, getContrastText } from '../services/colors';

const themeColors = [
  { name: 'Electric', color: '#9ba8ff' },
  { name: 'Pulse', color: '#e966ff' },
  { name: 'Fire', color: '#ff6e85' },
  { name: 'Core', color: '#4963ff' },
  { name: 'Deep', color: '#c500e6' },
  { name: 'Zen', color: '#778aff' },
  { name: 'White', color: '#FFFFFF' },
];

const SettingItem = memo(({ icon: Icon, title, value, color = '#f0f0fd', onPress, hasSwitch = false, switchValue = false, onSwitchChange }: any) => {
    const { isDarkMode } = useSelector((state: RootState) => state.theme);
    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
    const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
    const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

    return (
        <TouchableOpacity 
            onPress={hasSwitch ? undefined : onPress}
            className="flex-row items-center p-5 rounded-xl mb-2"
            style={{ backgroundColor: surfaceLow }}
            activeOpacity={hasSwitch ? 1 : 0.7}
        >
            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                <Icon size={20} color={color} />
            </View>
            <View className="flex-1 ml-4">
                <Text className="text-base font-semibold" style={{ color: textColor }}>{title}</Text>
                {value && <Text className="text-sm mt-0.5" style={{ color: subTextColor }}>{value}</Text>}
            </View>
            {hasSwitch ? (
                <Switch 
                    value={switchValue} 
                    onValueChange={onSwitchChange}
                    trackColor={{ false: isDarkMode ? '#222532' : '#94A3B8', true: color }}
                    thumbColor={switchValue ? 'white' : '#737580'}
                />
            ) : (
                <ChevronRight size={18} color={subTextColor} />
            )}
        </TouchableOpacity>
    );
});

const SettingsScreen = () => {
    const user = useSelector((state: RootState) => state.auth);
    const { primaryColor, themeName, mood, isDarkMode } = useSelector((state: RootState) => state.theme);
    const { isTablet, getResponsiveContainerStyle } = useResponsive();
    const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
    const [showHighlightCreator, setShowHighlightCreator] = useState(false);
    const [highlights, setHighlights] = useState<Highlight[]>([]);

    const loadHighlights = useCallback(async () => {
        if (!user.uid) return;
        try {
            const data = await fetchUserHighlights(user.uid);
            setHighlights(data);
        } catch (error) {
            console.error(error);
        }
    }, [user.uid]);

    useEffect(() => {
        loadHighlights();
    }, [loadHighlights]);

    const dispatch = useDispatch();
    const navigation = useNavigation<any>();
    const [friendCount, setFriendCount] = useState(0);
    const [snapCount, setSnapCount] = useState(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [ghostMode, setGhostMode] = useState(false);
    
    // Admin Panel State
    const [showAdminAuth, setShowAdminAuth] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const lastTapRef = useRef(0);
    const tapCountRef = useRef(0);

    const handlePrivacyTap = () => {
        const now = Date.now();
        const MULTI_PRESS_DELAY = 500;

        if (now - lastTapRef.current < MULTI_PRESS_DELAY) {
            tapCountRef.current += 1;
            if (tapCountRef.current >= 5) {
                setShowAdminAuth(true);
                tapCountRef.current = 0;
            }
        } else {
            tapCountRef.current = 1;
        }
        lastTapRef.current = now;
    };

    const verifyAdmin = async () => {
        try {
            const adminRef = doc(db, 'config', 'admin');
            const adminSnap = await getDoc(adminRef);
            
            if (adminSnap.exists() && adminSnap.data().password === adminPassword) {
                setShowAdminAuth(false);
                setAdminPassword('');
                navigation.navigate('AdminPanel');
            } else {
                Alert.alert('Error', 'Incorrect Admin Password');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not verify. Check your connection.');
        }
    };

    useEffect(() => {
        if (!user.uid) return;
        
        const unsubFriends = subscribeToFriends(user.uid, (friends) => {
            setFriendCount(friends.length);
        });

        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setSnapCount(data.snapCount || 0);
                setGhostMode(data.ghostMode || false);
            }
        });

        return () => {
            unsubFriends();
            unsubUser();
        };
    }, [user.uid]);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            dispatch(logout());
        } catch (error) {
            console.error('Logout failed', error);
            dispatch(logout());
        }
    }, [dispatch]);

    const handleThemeChange = useCallback((colorObj: any) => {
        dispatch(setTheme({ primaryColor: colorObj.color, themeName: colorObj.name }));
    }, [dispatch]);

    const handleMoodChange = useCallback((moodName: string) => {
        dispatch(setMood(moodName));
    }, [dispatch]);

    const toggleAppLock = async (value: boolean) => {
        if (value) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                Alert.alert("Biometrics Unavailable", "Your device does not support biometrics or has none set up.");
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Enable App Lock',
                fallbackLabel: 'Enter Passcode',
            });

            if (result.success) {
                dispatch(setAppLock(true));
            }
        } else {
            dispatch(setAppLock(false));
        }
    };

    const toggleGhostMode = async (value: boolean) => {
        if (!user.uid) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { ghostMode: value });
        } catch (error) {
            console.error(error);
        }
    };

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
    const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
    const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

    return (
        <ScreenBackground showBubbles={false}>
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View style={getResponsiveContainerStyle()} className="px-5">
                    {/* Profile Section */}
                    <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} className="items-center py-8">
                        <View className="relative">
                            <View className="absolute -inset-1 rounded-full opacity-25" 
                                  style={{ backgroundColor: primaryColor }} />
                            <View className="w-32 h-32 rounded-full items-center justify-center overflow-hidden p-1" style={{ backgroundColor: surfaceHigh }}>
                                {user.photoURL ? (
                                    <Image source={{ uri: user.photoURL }} className="w-full h-full rounded-full" />
                                ) : (
                                    <Text className="text-4xl font-black" style={{ color: primaryColor }}>
                                        {(user.displayName || '?').charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full items-center justify-center border-2"
                                  style={{ backgroundColor: primaryColor, borderColor: isDarkMode ? '#000000' : '#F8F9FF' }}>
                                <CameraIcon size={16} color={getContrastText(primaryColor)} />
                            </View>
                        </View>
                        <Text className="text-3xl font-black mt-4 tracking-tight" style={{ color: textColor }}>{user.displayName || 'Anonymous'}</Text>
                        <Text className="font-medium" style={{ color: subTextColor }}>{user.phoneNumber}</Text>
                    </TouchableOpacity>

                    {/* Stats Grid */}
                    <View className="flex-row mb-8">
                        <View className="flex-1 rounded-xl p-4 items-center mr-2 shadow-sm" style={{ backgroundColor: surfaceLow }}>
                            <Text className="text-xs uppercase tracking-widest mb-1" style={{ color: subTextColor }}>Friends</Text>
                            <Text className="text-xl font-bold" style={{ color: isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor }}>{friendCount}</Text>
                        </View>
                        <View className="flex-1 rounded-xl p-4 items-center mx-1" style={{ backgroundColor: surfaceLow }}>
                            <Text className="text-xs uppercase tracking-widest mb-1" style={{ color: subTextColor }}>Snaps</Text>
                            <Text className="text-xl font-bold text-tertiary">{snapCount || 0}</Text>
                        </View>
                        <View className="flex-1 rounded-xl p-4 items-center ml-2" style={{ backgroundColor: surfaceLow }}>
                            <Text className="text-xs uppercase tracking-widest mb-1" style={{ color: subTextColor }}>Privacy</Text>
                            <Text className="text-xl font-bold text-secondary">98%</Text>
                        </View>
                    </View>

                    {/* Edit Profile */}
                    <View className="flex-row mb-8">
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('ProfileSetup')}
                            className="flex-1 py-4 px-6 rounded-2xl items-center justify-center flex-row shadow-sm"
                            style={{ borderLeftWidth: 4, borderLeftColor: primaryColor, backgroundColor: surfaceLow }}
                        >
                            <Edit3 size={18} color={primaryColor} />
                            <Text className="font-bold ml-2" style={{ color: textColor }}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Highlights Section */}
                    <View className="w-full mb-10">
                        <View className="flex-row items-center justify-between px-1 mb-4">
                            <Text className="text-[10px] font-black uppercase tracking-widest" style={{ color: subTextColor }}>My Highlights</Text>
                            <TouchableOpacity 
                                onPress={() => setShowHighlightCreator(true)}
                                className="flex-row items-center"
                            >
                                <Plus size={14} color={primaryColor} />
                                <Text className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: primaryColor }}>New</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {highlights.length === 0 ? (
                                <TouchableOpacity 
                                    onPress={() => setShowHighlightCreator(true)}
                                    className="w-16 h-16 rounded-3xl border-2 border-dashed items-center justify-center mr-4"
                                    style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                                >
                                    <Plus size={24} color={subTextColor} />
                                </TouchableOpacity>
                            ) : (
                                highlights.map(h => (
                                    <TouchableOpacity 
                                        key={h.id}
                                        onPress={() => setActiveHighlight(h)}
                                        onLongPress={() => {
                                            Alert.alert("Delete Highlight", "Are you sure you want to remove this highlight?", [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Delete", style: "destructive", onPress: async () => {
                                                    await deleteHighlight(h.id!);
                                                    loadHighlights();
                                                }}
                                            ]);
                                        }}
                                        className="items-center mr-6"
                                    >
                                        <View className="w-16 h-16 rounded-3xl overflow-hidden border-2 p-1" style={{ borderColor: primaryColor }}>
                                            <Image source={{ uri: h.coverImage }} className="w-full h-full rounded-2xl" />
                                        </View>
                                        <Text className="text-[10px] font-bold mt-2" style={{ color: textColor }}>{h.name}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>

                    {/* Bento Cards */}
                    <View className="flex-row mb-6">
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            onPress={handlePrivacyTap}
                            className="flex-1 rounded-xl p-6 h-40 justify-between mr-2" 
                            style={{ backgroundColor: surfaceLow }}
                        >
                            <Text className="text-sm uppercase tracking-widest" style={{ color: primaryColor }}>Privacy Score</Text>
                            <View>
                                <Text className="text-4xl font-black tracking-tighter" style={{ color: textColor }}>98%</Text>
                                <Text className="text-xs mt-1" style={{ color: subTextColor }}>Highly Secured</Text>
                            </View>
                        </TouchableOpacity>
                        <View className="flex-1 rounded-xl p-6 h-40 justify-between ml-2"
                              style={{ 
                                backgroundColor: isDarkMode ? '#000000' : '#4963ff',
                                borderWidth: isDarkMode ? 1 : 0,
                                borderColor: primaryColor,
                                shadowColor: isDarkMode ? primaryColor : '#4963ff',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: isDarkMode ? 0.3 : 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                              }}>
                            <Text className="text-white/80 text-sm uppercase tracking-widest">Snap Premium</Text>
                            <TouchableOpacity 
                                className="py-2 px-4 rounded-full self-start"
                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }}
                            >
                                <Text className="text-white text-sm font-bold">Manage Plan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Feature Toggles */}
                    <SettingItem 
                        icon={Bell} 
                        title="Notifications" 
                        value={notificationsEnabled ? "Alerts & Sounds enabled" : "Muted"} 
                        color={primaryColor} 
                        hasSwitch={true}
                        switchValue={notificationsEnabled}
                        onSwitchChange={setNotificationsEnabled}
                    />
                    <SettingItem 
                        icon={Shield} 
                        title="Ghost Mode" 
                        value={ghostMode ? "Stealth browsing active" : "Online status visible"} 
                        color="#e966ff" 
                        hasSwitch={true}
                        switchValue={ghostMode}
                        onSwitchChange={toggleGhostMode}
                    />
                    <SettingItem
                        icon={Lock}
                        title="App Lock"
                        value={user.isAppLockEnabled ? "Secured with biometrics" : "Lock app on background"}
                        color="#10B981"
                        hasSwitch={true}
                        switchValue={user.isAppLockEnabled}
                        onSwitchChange={toggleAppLock}
                    />

                    {/* Theme & Customization */}
                    <SettingItem
                        icon={Palette}
                        title="App Theme"
                        value={themeName}
                        color="#9ba8ff"
                        onPress={() => navigation.navigate('ThemeSettings' as any)}
                    />
                    <SettingItem
                        icon={ImageIcon}
                        title="Chat Wallpaper"
                        value="Personalize your chat background"
                        color={primaryColor}
                        onPress={() => navigation.navigate('WallpaperSettings')}
                    />

                    {/* Legal & Support */}
                    <SettingItem
                        icon={HelpCircle}
                        title="Help & Support"
                        value="Open complaint box and view replies"
                        color="#4963ff"
                        onPress={() => navigation.navigate('SupportRequest')}
                    />
                    <TouchableOpacity 
                        className="py-4 items-center"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    >
                        <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: subTextColor }}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="py-2 items-center"
                        onPress={() => navigation.navigate('TermsOfService')}
                    >
                        <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: subTextColor }}>Terms of Service</Text>
                    </TouchableOpacity>

                    {/* Logout */}
                    <TouchableOpacity 
                        onPress={handleLogout}
                        className="flex-row items-center justify-center py-5 rounded-2xl mt-6 mb-4"
                        style={{ backgroundColor: surfaceLow }}
                        activeOpacity={0.7}
                    >
                        <LogOut size={20} color="#ff6e85" />
                        <Text className="ml-2 text-lg font-bold" style={{ color: textColor }}>Logout</Text>
                    </TouchableOpacity>

                    <View className="py-8 items-center pb-32">
                        <Text className="text-[10px] uppercase tracking-widest" style={{ color: subTextColor, opacity: 0.4 }}>ChatSnap v4.2.0 • Build 992</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Modals outside ScrollView */}

            <Modal
                animationType="fade"
                transparent={true}
                visible={showAdminAuth}
                onRequestClose={() => setShowAdminAuth(false)}
            >
                <TouchableOpacity 
                    className="flex-1 bg-black/80 items-center justify-center p-6"
                    activeOpacity={1}
                    onPress={() => setShowAdminAuth(false)}
                >
                    <View className={`rounded-[40px] p-8 w-full ${isTablet ? 'max-w-md' : ''}`}
                          style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}
                          onStartShouldSetResponder={() => true}
                          onResponderRelease={(e) => e.stopPropagation()}
                    >
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Shield size={32} color={primaryColor} />
                            </View>
                            <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Admin Access</Text>
                            <Text className="text-sm mt-1 text-center" style={{ color: subTextColor }}>Enter the master password to view the user database.</Text>
                        </View>

                        <View className="w-full relative justify-center mb-6">
                            <TextInput
                                className="w-full py-4 pl-6 pr-14 rounded-2xl text-xl font-bold"
                                style={{ backgroundColor: surfaceLow, color: textColor }}
                                placeholder="Admin Password"
                                placeholderTextColor={subTextColor}
                                secureTextEntry={!showAdminPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={adminPassword}
                                onChangeText={setAdminPassword}
                                autoFocus
                            />
                            <TouchableOpacity 
                                onPress={() => setShowAdminPassword(!showAdminPassword)}
                                className="absolute right-4 p-2"
                            >
                                {showAdminPassword ? <EyeOff size={20} color={subTextColor} /> : <Eye size={20} color={subTextColor} />}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            onPress={verifyAdmin}
                            className="w-full py-4 rounded-2xl items-center"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Text className="text-white font-bold text-lg uppercase tracking-widest">Verify & Enter</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <HighlightSelectionModal 
                isVisible={showHighlightCreator}
                onClose={() => setShowHighlightCreator(false)}
                onSuccess={loadHighlights}
            />

            <HighlightsViewer 
                isVisible={!!activeHighlight}
                highlight={activeHighlight}
                onClose={() => setActiveHighlight(null)}
            />
        </ScreenBackground>
    );
};

export default SettingsScreen;
