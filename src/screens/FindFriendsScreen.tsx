import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Animated as RNAnimated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, UserPlus, Check, ArrowRight, Smartphone, Search } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigation } from '@react-navigation/native';
import { syncContacts, ContactUser, searchUsers } from '../services/contacts';
import { sendFriendRequest, subscribeToSentRequests, cancelFriendRequest } from '../services/social';
import { useResponsive } from '../hooks/useResponsive';
import ScreenBackground from '../components/ui/ScreenBackground';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

const FindFriendsScreen = () => {
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const auth = useSelector((state: RootState) => state.auth);
    const { isTablet, getResponsiveContainerStyle } = useResponsive();
    const navigation = useNavigation<any>();

    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [hasSynced, setHasSynced] = useState(false);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const surfaceColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    useEffect(() => {
        if (!auth.uid) return;
        const unsub = subscribeToSentRequests(auth.uid, (ids) => {
            setRequestedIds(ids);
        });
        return () => unsub();
    }, [auth.uid]);

    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const results = await searchUsers(searchQuery);
                    // Filter out already found contacts, self, and potentially blocked (if service handles it)
                    const contactUids = new Set(contacts.map(c => c.uid));
                    setSearchResults(results.filter(r => !contactUids.has(r.uid) && r.uid !== auth.uid));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timeout = setTimeout(performSearch, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, contacts, auth.uid]);

    const handleSync = async () => {
        setLoading(true);
        setError(null);
        try {
            const synced = await syncContacts();
            // Filter out self
            const filtered = synced.filter(c => c.uid !== auth.uid);
            setContacts(filtered);
            setHasSynced(true);
        } catch (err: any) {
            setError(err.message || 'Failed to sync contacts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (user: ContactUser) => {
        try {
            await sendFriendRequest(user.uid, auth.displayName || 'Friend', auth.photoURL || undefined, 'contact');
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleCancelRequest = async (user: ContactUser) => {
        try {
            await cancelFriendRequest(user.uid);
        } catch (err: any) {
            console.error(err);
        }
    };

    const renderContact = ({ item, index }: { item: ContactUser, index: number }) => {
        const isRequested = requestedIds.includes(item.uid);

        return (
            <Animated.View 
                entering={FadeInDown.delay(index * 100).duration(500)}
                layout={Layout.springify()}
                className="flex-row items-center p-4 mb-3 rounded-3xl"
                style={{ backgroundColor: surfaceColor }}
            >
                <View className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 items-center justify-center">
                    {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} className="w-full h-full" />
                    ) : (
                        <Text className="font-bold text-lg" style={{ color: primaryColor }}>
                            {item.displayName ? item.displayName.charAt(0).toUpperCase() : '?'}
                        </Text>
                    )}
                </View>
                
                <View className="flex-1 ml-4">
                    <View className="flex-row items-center">
                        <Text className="font-bold text-base" style={{ color: textColor }}>{item.displayName}</Text>
                        <View className="ml-2 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                            <Text className="text-[8px] font-black uppercase tracking-tighter" style={{ color: primaryColor }}>Contact</Text>
                        </View>
                    </View>
                    <Text className="text-xs" style={{ color: subTextColor }}>{item.phoneNumber}</Text>
                </View>

                <TouchableOpacity 
                    onPress={() => isRequested ? handleCancelRequest(item) : handleAddFriend(item)}
                    className={`px-4 py-2 rounded-full flex-row items-center ${isRequested ? 'bg-surface-container-highest' : ''}`}
                    style={{ backgroundColor: isRequested ? undefined : primaryColor }}
                >
                    {isRequested ? (
                        <Text className="font-bold text-xs text-onSurface-variant">Cancel</Text>
                    ) : (
                        <>
                            <UserPlus size={14} color="white" />
                            <Text className="ml-1 font-bold text-xs text-white">Add</Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <ScreenBackground>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <SafeAreaView className="flex-1">
                <View className="flex-1 px-6 pt-10" style={getResponsiveContainerStyle()}>
                    {!hasSynced ? (
                        <View className="flex-1 items-center justify-center">
                            <Animated.View entering={FadeInUp.duration(1000)} className="items-center">
                                <View 
                                    className="w-24 h-24 rounded-[40px] items-center justify-center mb-8 shadow-xl"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Smartphone size={48} color="white" />
                                </View>
                                <Text className="text-3xl font-black text-center mb-4" style={{ color: textColor }}>
                                    Find Your Crew
                                </Text>
                                <Text className="text-center text-base px-10 mb-12 leading-6" style={{ color: subTextColor }}>
                                    Connect your contacts to see who's already using ChatSnap and start chatting instantly.
                                </Text>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(500).duration(800)} className="w-full px-4">
                                <TouchableOpacity 
                                    onPress={handleSync}
                                    disabled={loading}
                                    className="w-full py-5 rounded-[24px] flex-row items-center justify-center shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Search size={20} color="white" />
                                            <Text className="ml-3 text-white font-black text-lg">Sync Contacts</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={() => navigation.replace('Home')}
                                    className="w-full py-5 mt-4 rounded-[24px] items-center justify-center"
                                >
                                    <Text className="font-bold text-base" style={{ color: subTextColor }}>Skip for now</Text>
                                </TouchableOpacity>

                                {error && (
                                    <Text className="mt-4 text-red-500 text-center font-medium">{error}</Text>
                                )}
                            </Animated.View>
                        </View>
                    ) : (
                        <View className="flex-1">
                            <Animated.View entering={FadeInUp.duration(800)} className="mb-6">
                                <Text className="text-3xl font-black mb-2" style={{ color: textColor }}>
                                    Find Friends
                                </Text>
                                <Text className="text-base" style={{ color: subTextColor }}>
                                    Add people to start messaging.
                                </Text>
                            </Animated.View>

                            <Animated.View 
                                entering={FadeInDown.delay(200).duration(800)}
                                className="flex-row items-center px-4 py-3 rounded-2xl mb-6 border"
                                style={{ backgroundColor: surfaceColor, borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                            >
                                <Search size={20} color={subTextColor} />
                                <TextInput 
                                    className="flex-1 ml-3 font-bold text-base"
                                    style={{ color: textColor }}
                                    placeholder="Search by name or phone..."
                                    placeholderTextColor={subTextColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {isSearching && <ActivityIndicator size="small" color={primaryColor} />}
                            </Animated.View>

                            <FlatList
                                data={[...contacts, ...searchResults]}
                                keyExtractor={(item) => item.uid}
                                renderItem={renderContact}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 120 }}
                                ListEmptyComponent={
                                    <View className="mt-20 items-center justify-center">
                                        {searchQuery.length >= 2 ? (
                                            <Text className="text-center px-10" style={{ color: subTextColor }}>
                                                No users found matching "{searchQuery}"
                                            </Text>
                                        ) : (
                                            <>
                                                <Users size={64} color={subTextColor} />
                                                <Text className="mt-4 text-center px-10" style={{ color: subTextColor }}>
                                                    No registered contacts found. Try searching for a name above!
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                }
                            />

                            <View className="absolute bottom-6 left-0 right-0 px-6">
                                <TouchableOpacity 
                                    onPress={() => navigation.replace('Home')}
                                    className="w-full py-5 rounded-[24px] flex-row items-center justify-center shadow-2xl"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Text className="text-white font-black text-lg mr-2">Finish Setup</Text>
                                    <ArrowRight size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </ScreenBackground>
    );
};

export default FindFriendsScreen;
