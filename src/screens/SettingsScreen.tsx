import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StatusBar, Modal, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { RootState } from '../store';
import { User, LogOut, ChevronRight, Bell, Shield, HelpCircle, UserRound, Palette, Sparkles, Smile, Coffee, Heart, Zap, Moon, Edit3, Camera as CameraIcon, Sun, Eye, EyeOff } from 'lucide-react-native';
import Header from '../components/ui/Header';
import { useNavigation } from '@react-navigation/native';
import { setTheme, setMood, toggleDarkMode } from '../store/themeSlice';
import ScreenBackground from '../components/ui/ScreenBackground';
import { subscribeToFriends } from '../services/social';
import { QrCode, X, Copy, Info } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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
    const dispatch = useDispatch();
    const navigation = useNavigation<any>();
    const [friendCount, setFriendCount] = React.useState(0);
    const [snapCount, setSnapCount] = React.useState(0);
    const [showQR, setShowQR] = React.useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [ghostMode, setGhostMode] = React.useState(false);
    
    // Admin Panel State
    const [showAdminAuth, setShowAdminAuth] = React.useState(false);
    const [adminPassword, setAdminPassword] = React.useState('');
    const [showAdminPassword, setShowAdminPassword] = React.useState(false);
    const lastTapRef = React.useRef(0);
    const tapCountRef = React.useRef(0);

    const handlePrivacyTap = () => {
        const now = Date.now();
        const MULTI_PRESS_DELAY = 500; // Time window between each rapid tap

        if (now - lastTapRef.current < MULTI_PRESS_DELAY) {
            tapCountRef.current += 1;
            if (tapCountRef.current >= 5) { // 5 taps threshold reached
                setShowAdminAuth(true);
                tapCountRef.current = 0; // Reset after triggering
            }
        } else {
            // Too slow, reset the counter to 1
            tapCountRef.current = 1;
        }
        
        lastTapRef.current = now;
    };

    const verifyAdmin = () => {
        if (adminPassword === 'MohsinAbbas.9925') {
            setShowAdminAuth(false);
            setAdminPassword('');
            navigation.navigate('AdminPanel');
        } else {
            alert('Incorrect Admin Password');
        }
    };

    React.useEffect(() => {
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
            // Even if firebase fails, we should clear state
            dispatch(logout());
        }
    }, [dispatch]);

    const handleThemeChange = useCallback((colorObj: any) => {
        dispatch(setTheme({ primaryColor: colorObj.color, themeName: colorObj.name }));
    }, [dispatch]);

    const handleMoodChange = useCallback((moodName: string) => {
        dispatch(setMood(moodName));
    }, [dispatch]);

    const toggleGhostMode = async (value: boolean) => {
        setGhostMode(value);
        if (user.uid) {
            await updateDoc(doc(db, 'users', user.uid), { ghostMode: value });
        }
    };

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
    const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
    const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

    return (
        <ScreenBackground showBubbles={false}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-8">
                <View style={getResponsiveContainerStyle()} className="px-5">
                {/* Profile Section */}
                <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} className="items-center py-8">
                    <View className="relative">
                        {/* Gradient glow behind avatar */}
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
                        {/* Edit button bubble */}
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

                {/* Edit Profile + QR */}
                <View className="flex-row mb-8">
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('ProfileSetup')}
                        className="flex-1 py-4 px-6 rounded-2xl items-center justify-center flex-row mr-2 shadow-sm"
                        style={{ borderLeftWidth: 4, borderLeftColor: primaryColor, backgroundColor: surfaceLow }}
                    >
                        <Edit3 size={18} color={primaryColor} />
                        <Text className="font-bold ml-2" style={{ color: textColor }}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setShowQR(true)}
                        className="flex-1 py-4 px-6 rounded-2xl items-center justify-center flex-row shadow-sm"
                        style={{ borderRightWidth: 4, borderRightColor: '#9ba8ff', backgroundColor: surfaceLow }}
                    >
                        <QrCode size={18} color="#9ba8ff" />
                        <Text className="font-bold ml-2" style={{ color: textColor }}>SnapCode</Text>
                    </TouchableOpacity>
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

                {/* Dark Mode Toggle */}
                <View className="rounded-xl p-5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: surfaceLow }}>
                    <View className="flex-row items-center">
                         <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                            {isDarkMode ? <Moon size={20} color={primaryColor} /> : <Sun size={20} color="#ffb020" />}
                         </View>
                         <View className="ml-4">
                            <Text className="text-base font-semibold" style={{ color: textColor }}>Dark Mode</Text>
                            <Text className="text-xs" style={{ color: subTextColor }}>{isDarkMode ? 'On' : 'Off'}</Text>
                         </View>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={() => { dispatch(toggleDarkMode()); }}
                        trackColor={{ false: isDarkMode ? '#222532' : '#94A3B8', true: primaryColor }}
                        thumbColor={'#fff'}
                    />
                </View>

                {/* Theme Color */}
                <View className="rounded-xl p-5 mb-2" style={{ backgroundColor: surfaceLow }}>
                    <View className="flex-row items-center mb-4">
                         <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                            <Palette size={20} color="#9ba8ff" />
                         </View>
                         <View className="ml-4 flex-1">
                            <Text className="text-base font-semibold" style={{ color: textColor }}>Theme Color</Text>
                            <Text className="text-xs" style={{ color: subTextColor }}>{themeName}</Text>
                         </View>
                    </View>
                    <View className="flex-row justify-between pr-4 mt-2">
                        {themeColors.map((item) => (
                            <TouchableOpacity 
                                key={item.color}
                                onPress={() => handleThemeChange(item)}
                                style={{ 
                                    backgroundColor: item.color,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    borderWidth: primaryColor === item.color ? 3 : 0,
                                    borderColor: isDarkMode ? '#FFFFFF' : '#000000'
                                }}
                            />
                        ))}
                    </View>
                </View>

                {/* Mood */}
                <View className="rounded-xl p-5 mb-2" style={{ backgroundColor: surfaceLow }}>
                    <View className="flex-row items-center mb-4">
                         <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                            <Sparkles size={20} color="#e966ff" />
                         </View>
                         <View className="ml-4 flex-1">
                            <Text className="text-base font-semibold" style={{ color: textColor }}>Current Mood</Text>
                            <Text className="text-xs" style={{ color: subTextColor }}>{mood}</Text>
                         </View>
                    </View>
                    <View className="flex-row justify-between pr-4 mt-2">
                        {[
                            { name: 'Happy', icon: Smile },
                            { name: 'Chill', icon: Coffee },
                            { name: 'Love', icon: Heart },
                            { name: 'Zen', icon: Moon },
                            { name: 'Deep', icon: Sparkles },
                            { name: 'Fire', icon: Zap },
                        ].map((item) => (
                            <TouchableOpacity 
                                key={item.name}
                                onPress={() => handleMoodChange(item.name)}
                                className="items-center"
                            >
                                <View 
                                    style={{ 
                                        backgroundColor: mood === item.name ? primaryColor : surfaceHigh,
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                    }}
                                    className="items-center justify-center mb-1"
                                >
                                    <item.icon size={20} color={mood === item.name ? getContrastText(primaryColor) : subTextColor} />
                                </View>
                                <Text className="text-[10px] font-bold" style={{ color: subTextColor }}>{item.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>



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
                    icon={QrCode}
                    title="My QR Code"
                    value="Share your profile"
                    color="#9ba8ff"
                    onPress={() => navigation.navigate('QRProfile')}
                />
                <SettingItem
                    icon={QrCode}
                    title="Scan QR Code"
                    value="Add friends by scanning"
                    color="#5d8aff"
                    onPress={() => navigation.navigate('QRScanner')}
                />
                <SettingItem
                    icon={Shield}
                    title="Privacy Settings"
                    value="Manage your privacy"
                    color="#ff6e85"
                    onPress={() => navigation.navigate('PrivacySettings')}
                />
                <SettingItem icon={HelpCircle} title="Help & Support" value="FAQs and contact our team" color="#e966ff" />

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

                {/* QR Code Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showQR}
                    onRequestClose={() => setShowQR(false)}
                >
                    <TouchableOpacity 
                        className="flex-1 bg-black/80 items-center justify-center p-6"
                        activeOpacity={1}
                        onPress={() => setShowQR(false)}
                    >
                        <View className={`rounded-[40px] p-10 items-center w-full ${isTablet ? 'max-w-md' : ''}`}
                              style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}
                              onStartShouldSetResponder={() => true}
                              onResponderRelease={(e) => e.stopPropagation()}
                        >
                            <TouchableOpacity 
                                className="absolute top-6 right-6 p-2 rounded-full"
                                style={{ backgroundColor: surfaceHigh }}
                                onPress={() => setShowQR(false)}
                            >
                                <X size={20} color={subTextColor} />
                            </TouchableOpacity>

                            <View className="items-center mb-8">
                                <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                                    <QrCode size={32} color={primaryColor} />
                                </View>
                                <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>My SnapCode</Text>
                                <Text className="text-sm mt-1" style={{ color: subTextColor }}>Scan this to add me</Text>
                            </View>

                            <View className="p-6 bg-white rounded-3xl mb-8 shadow-2xl">
                                <Image 
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.uid}&bgcolor=ffffff&color=${primaryColor.replace('#', '')}` }}
                                    style={{ width: 200, height: 200 }}
                                />
                            </View>

                            <View className="p-4 rounded-2xl flex-row items-center w-full mb-2" style={{ backgroundColor: surfaceLow }}>
                                <View className="flex-1">
                                    <Text className="text-[10px] uppercase font-bold mb-1" style={{ color: subTextColor }}>User ID</Text>
                                    <Text className="text-xs font-mono font-bold" style={{ color: primaryColor }} numberOfLines={1}>{user.uid}</Text>
                                </View>
                                <TouchableOpacity className="p-2 ml-4">
                                    <Copy size={18} color={primaryColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Admin Auth Modal */}
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
                                    {showAdminPassword ? (
                                        <EyeOff size={20} color={subTextColor} />
                                    ) : (
                                        <Eye size={20} color={subTextColor} />
                                    )}
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
            </ScrollView>
        </ScreenBackground>
    );
};

export default SettingsScreen;
