import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StatusBar, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { RootState } from '../store';
import { User, LogOut, ChevronRight, Bell, Shield, HelpCircle, UserRound, Palette, Sparkles, Smile, Coffee, Heart, Zap, Moon, Edit3, Camera as CameraIcon } from 'lucide-react-native';
import Header from '../components/ui/Header';
import { useNavigation } from '@react-navigation/native';
import { setTheme, setMood } from '../store/themeSlice';
import ScreenBackground from '../components/ui/ScreenBackground';
import { subscribeToFriends } from '../services/social';
import { QrCode, X, Copy } from 'lucide-react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const themeColors = [
  { name: 'Electric', color: '#9ba8ff' },
  { name: 'Pulse', color: '#e966ff' },
  { name: 'Fire', color: '#ff6e85' },
  { name: 'Core', color: '#4963ff' },
  { name: 'Deep', color: '#c500e6' },
  { name: 'Zen', color: '#778aff' },
];

const SettingItem = memo(({ icon: Icon, title, value, color = '#f0f0fd', onPress, hasSwitch = false, switchValue = false, onSwitchChange }: any) => (
    <TouchableOpacity 
        onPress={hasSwitch ? undefined : onPress}
        className="flex-row items-center p-5 bg-surface-container-low rounded-xl mb-2"
        activeOpacity={hasSwitch ? 1 : 0.7}
    >
        <View className="w-12 h-12 rounded-full bg-surface-container-highest items-center justify-center">
            <Icon size={20} color={color} />
        </View>
        <View className="flex-1 ml-4">
            <Text className="text-base font-semibold text-onSurface">{title}</Text>
            {value && <Text className="text-onSurface-variant text-sm mt-0.5">{value}</Text>}
        </View>
        {hasSwitch ? (
            <Switch 
                value={switchValue} 
                onValueChange={onSwitchChange}
                trackColor={{ false: '#222532', true: color }}
                thumbColor={switchValue ? 'white' : '#737580'}
            />
        ) : (
            <ChevronRight size={18} color="#464752" />
        )}
    </TouchableOpacity>
));

const SettingsScreen = () => {
    const user = useSelector((state: RootState) => state.auth);
    const { primaryColor, themeName, mood } = useSelector((state: RootState) => state.theme);
    const dispatch = useDispatch();
    const navigation = useNavigation<any>();
    const [friendCount, setFriendCount] = React.useState(0);
    const [showQR, setShowQR] = React.useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

    React.useEffect(() => {
        if (!user.uid) return;
        const unsub = subscribeToFriends(user.uid, (friends) => {
            setFriendCount(friends.length);
        });
        return unsub;
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

    return (
        <ScreenBackground showBubbles={false}>
            <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5 pt-8">
                {/* Profile Section */}
                <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} className="items-center py-8">
                    <View className="relative">
                        {/* Gradient glow behind avatar */}
                        <View className="absolute -inset-1 rounded-full opacity-25" 
                              style={{ backgroundColor: primaryColor }} />
                        <View className="w-32 h-32 rounded-full bg-surface-container-highest items-center justify-center overflow-hidden border border-outline-variant/20 p-1">
                            {user.photoURL ? (
                                <Image source={{ uri: user.photoURL }} className="w-full h-full rounded-full" />
                            ) : (
                                <Text className="text-4xl font-black" style={{ color: primaryColor }}>
                                    {(user.displayName || '?').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        {/* Edit button bubble */}
                        <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full items-center justify-center border-2 border-surface"
                              style={{ backgroundColor: primaryColor }}>
                            <CameraIcon size={16} color="white" />
                        </View>
                    </View>
                    <Text className="text-3xl font-black mt-4 text-onSurface tracking-tight">{user.displayName || 'Anonymous'}</Text>
                    <Text className="text-onSurface-variant font-medium">{user.phoneNumber}</Text>
                </TouchableOpacity>

                {/* Stats Grid */}
                <View className="flex-row mb-8">
                    <View className="flex-1 bg-surface-container-low rounded-xl p-4 items-center border border-outline-variant/10 mr-2 shadow-sm">
                        <Text className="text-xs uppercase tracking-widest text-onSurface-variant mb-1">Friends</Text>
                        <Text className="text-xl font-bold text-primary">{friendCount}</Text>
                    </View>
                    <View className="flex-1 bg-surface-container-low rounded-xl p-4 items-center border border-outline-variant/10 mx-1">
                        <Text className="text-xs uppercase tracking-widest text-onSurface-variant mb-1">Snaps</Text>
                        <Text className="text-xl font-bold text-tertiary">0</Text>
                    </View>
                    <View className="flex-1 bg-surface-container-low rounded-xl p-4 items-center border border-outline-variant/10 ml-2">
                        <Text className="text-xs uppercase tracking-widest text-onSurface-variant mb-1">Privacy</Text>
                        <Text className="text-xl font-bold text-secondary">98%</Text>
                    </View>
                </View>

                {/* Edit Profile + QR */}
                <View className="flex-row mb-8">
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('ProfileSetup')}
                        className="flex-1 py-4 px-6 rounded-2xl bg-surface-container-low border border-outline-variant/10 items-center justify-center flex-row mr-2Shadow-sm"
                        style={{ borderLeftWidth: 4, borderLeftColor: primaryColor }}
                    >
                        <Edit3 size={18} color={primaryColor} />
                        <Text className="font-bold text-onSurface ml-2">Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setShowQR(true)}
                        className="flex-1 py-4 px-6 rounded-2xl bg-surface-container-low border border-outline-variant/10 items-center justify-center flex-row shadow-sm"
                        style={{ borderRightWidth: 4, borderRightColor: '#9ba8ff' }}
                    >
                        <QrCode size={18} color="#9ba8ff" />
                        <Text className="font-bold text-onSurface ml-2">SnapCode</Text>
                    </TouchableOpacity>
                </View>

                {/* Bento Cards */}
                <View className="flex-row mb-6">
                    <View className="flex-1 bg-surface-container rounded-xl p-6 h-40 justify-between border border-outline-variant/15 mr-2">
                        <Text className="text-primary-fixed text-sm uppercase tracking-widest">Privacy Score</Text>
                        <View>
                            <Text className="text-4xl font-black tracking-tighter text-onSurface">98%</Text>
                            <Text className="text-onSurface-variant text-xs mt-1">Highly Secured</Text>
                        </View>
                    </View>
                    <View className="flex-1 rounded-xl p-6 h-40 justify-between ml-2"
                          style={{ 
                            backgroundColor: '#4963ff',
                            shadowColor: '#9ba8ff',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4,
                          }}>
                        <Text className="text-white/80 text-sm uppercase tracking-widest">Snap Premium</Text>
                        <TouchableOpacity className="bg-white/20 py-2 px-4 rounded-full self-start">
                            <Text className="text-white text-sm font-bold">Manage Plan</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme Color */}
                <View className="bg-surface-container-low rounded-xl p-5 mb-2 border border-outline-variant/10">
                    <View className="flex-row items-center mb-4">
                         <View className="w-12 h-12 rounded-full bg-surface-container-highest items-center justify-center">
                            <Palette size={20} color="#9ba8ff" />
                         </View>
                         <View className="ml-4 flex-1">
                            <Text className="text-base font-semibold text-onSurface">Theme Color</Text>
                            <Text className="text-xs text-onSurface-variant">{themeName}</Text>
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
                                    borderColor: '#f0f0fd'
                                }}
                            />
                        ))}
                    </View>
                </View>

                {/* Mood */}
                <View className="bg-surface-container-low rounded-xl p-5 mb-2 border border-outline-variant/10">
                    <View className="flex-row items-center mb-4">
                         <View className="w-12 h-12 rounded-full bg-surface-container-highest items-center justify-center">
                            <Sparkles size={20} color="#e966ff" />
                         </View>
                         <View className="ml-4 flex-1">
                            <Text className="text-base font-semibold text-onSurface">Current Mood</Text>
                            <Text className="text-xs text-onSurface-variant">{mood}</Text>
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
                                        backgroundColor: mood === item.name ? primaryColor : '#222532',
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                    }}
                                    className="items-center justify-center mb-1"
                                >
                                    <item.icon size={20} color={mood === item.name ? 'white' : '#737580'} />
                                </View>
                                <Text className="text-[10px] font-bold text-onSurface-variant">{item.name}</Text>
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
                    className="flex-row items-center justify-center py-5 rounded-2xl bg-surface-container-low mt-6 mb-4"
                    activeOpacity={0.7}
                >
                    <LogOut size={20} color="#ff6e85" />
                    <Text className="ml-2 text-secondary text-lg font-bold">Logout</Text>
                </TouchableOpacity>

                <View className="py-8 items-center pb-32">
                    <Text className="text-onSurface-variant/40 text-[10px] uppercase tracking-widest">ChatSnap v4.2.0 • Build 992</Text>
                </View>

                {/* QR Code Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showQR}
                    onRequestClose={() => setShowQR(false)}
                >
                    <TouchableOpacity 
                        className="flex-1 bg-black/80 items-center justify-center"
                        activeOpacity={1}
                        onPress={() => setShowQR(false)}
                    >
                        <View className="bg-surface rounded-[40px] p-10 items-center w-[85%] border-2 border-primary/20"
                              onStartShouldSetResponder={() => true}
                              onResponderRelease={(e) => e.stopPropagation()}
                        >
                            <TouchableOpacity 
                                className="absolute top-6 right-6 p-2 bg-surface-container-highest rounded-full"
                                onPress={() => setShowQR(false)}
                            >
                                <X size={20} color="#737580" />
                            </TouchableOpacity>

                            <View className="items-center mb-8">
                                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                                    <QrCode size={32} color={primaryColor} />
                                </View>
                                <Text className="text-2xl font-black text-onSurface tracking-tight">My SnapCode</Text>
                                <Text className="text-onSurface-variant text-sm mt-1">Scan this to add me</Text>
                            </View>

                            <View className="p-6 bg-white rounded-3xl mb-8 shadow-2xl">
                                <Image 
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.uid}&bgcolor=ffffff&color=${primaryColor.replace('#', '')}` }}
                                    style={{ width: 200, height: 200 }}
                                />
                            </View>

                            <View className="bg-surface-container-low p-4 rounded-2xl flex-row items-center w-full mb-2">
                                <View className="flex-1">
                                    <Text className="text-[10px] uppercase font-bold text-onSurface-variant mb-1">User ID</Text>
                                    <Text className="text-xs font-mono text-primary font-bold" numberOfLines={1}>{user.uid}</Text>
                                </View>
                                <TouchableOpacity className="p-2 ml-4">
                                    <Copy size={18} color={primaryColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>
        </ScreenBackground>
    );
};

export default SettingsScreen;
