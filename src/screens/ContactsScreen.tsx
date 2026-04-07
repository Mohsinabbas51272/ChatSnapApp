import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform, TextInput, ScrollView, Alert, Modal, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/ui/Header';
import { syncContacts, ContactUser, searchUsers } from '../services/contacts';
import { 
  sendFriendRequest, 
  subscribeToFriendRequests, 
  subscribeToFriends, 
  respondToFriendRequest,
  subscribeToSentRequests,
  subscribeToBlockedUsers,
  subscribeToWhoBlockedMe,
  unfriend,
  cancelFriendRequest,
  FriendRequest
} from '../services/social';
import { subscribeToSecretConversations } from '../services/messaging';
import { fetchUsersByIds } from '../services/contacts';
import { useNavigation } from '@react-navigation/native';
import { 
  UserPlus, UserCheck, Clock, Check, X, Users, MessageCircle, Plus, 
  Info, Lock, Shield, Eye, EyeOff, Scan, QrCode, Search, Star, Heart 
} from 'lucide-react-native';
import { getMutualFriends, createGroup, subscribeToGroups, Group } from '../services/groups';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useDispatch } from 'react-redux';
import ShimmerPlaceholder from '../components/ui/ShimmerPlaceholder';

import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';

const ContactsScreen = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
  const [friendUsers, setFriendUsers] = useState<ContactUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [secretPartnerIds, setSecretPartnerIds] = useState<string[]>([]);
  const [blockedByMe, setBlockedByMe] = useState<string[]>([]);
  const [blockedByOther, setBlockedByOther] = useState<string[]>([]);
  const [mutualFriends, setMutualFriends] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  // Lock Flow States
  const [showSecretSetup, setShowSecretSetup] = useState(false);
  const [showSecretLogin, setShowSecretLogin] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [pendingSecretUser, setPendingSecretUser] = useState<ContactUser | null>(null);

  // QR Social States
  const [showScanModal, setShowScanModal] = useState(false);
  const [showMyQrModal, setShowMyQrModal] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const auth = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    // Format: chatsnap:user:UID
    if (data.startsWith('chatsnap:user:')) {
      const scannedUid = data.replace('chatsnap:user:', '');
      if (scannedUid === auth.uid) {
         Alert.alert("Khud ko?", "Aap apna hi QR code scan kar rahe hain!");
         setScanned(false);
         return;
      }
      
      try {
        setLoading(true);
        setShowScanModal(false);
        // Fetch the user data by scanned UID
        const profiles = await fetchUsersByIds([scannedUid]);
        if (profiles.length > 0) {
           const targetUser = profiles[0];
           Alert.alert(
              "Dost Mil Gaya!",
              `${targetUser.displayName} ko friend request bhejein?`,
              [
                { text: "Nahi", style: "cancel", onPress: () => setScanned(false) },
                { text: "Bhejein", onPress: async () => {
                   await handleSendRequest(targetUser);
                   setScanned(false);
                }}
              ]
           );
        } else {
           Alert.alert("Nahi Mila", "Yeh user nahi mil saka.");
           setScanned(false);
        }
      } catch (e) {
        Alert.alert("Masla", "QR scan karne mein masla hua.");
        setScanned(false);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Ghalat QR", "Yeh ChatSnap ka valid QR code nahi hai.");
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
       const { granted } = await requestPermission();
       if (!granted) {
          Alert.alert("Camera Rukawat", "QR scan karne ke liye camera ki permission chahiye.");
          return;
       }
    }
    setScanned(false);
    setShowScanModal(true);
  };

  const handleSetupSecretPassword = async () => {
    if (tempPassword.length < 4) {
       Alert.alert("Weak Password", "Secret password must be at least 4 characters long.");
       return;
    }
    try {
      await updateDoc(doc(db, 'users', auth.uid!), { secretPassword: tempPassword });
      dispatch({ type: 'auth/setUser', payload: { ...auth, secretPassword: tempPassword } });
      setShowSecretSetup(false);
      setTempPassword('');
      if (pendingSecretUser) {
         navigation.navigate('Chat', { user: pendingSecretUser });
         setPendingSecretUser(null);
      }
    } catch (e: any) {}
  };

  const handleVerifySecretPassword = () => {
    if (tempPassword === auth.secretPassword) {
      setShowSecretLogin(false);
      setTempPassword('');
      if (pendingSecretUser) {
         navigation.navigate('Chat', { user: pendingSecretUser });
         setPendingSecretUser(null);
      }
    } else {
      Alert.alert("Access Denied", "Incorrect Secret Password.");
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Secret Password",
      "This will erase your current secret password. You'll need to set a new one. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', auth.uid!), { secretPassword: null });
            dispatch({ type: 'auth/setUser', payload: { ...auth, secretPassword: null } });
            setShowSecretLogin(false);
            setTempPassword('');
            setShowPasswordText(false);
            setPendingSecretUser(null);
          } catch (e: any) {
            Alert.alert("Error", "Could not reset password.");
          }
        }}
      ]
    );
  };

  const filteredContacts = useMemo(() => {
    const hiddenUids = new Set([...blockedByMe, ...blockedByOther]);
    return contacts.filter(contact => 
      !hiddenUids.has(contact.uid) && (
        (contact.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (contact.phoneNumber || '').includes(searchQuery || '')
      )
    );
  }, [contacts, searchQuery, blockedByMe, blockedByOther]);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          // Get global results
          const results = await searchUsers(searchQuery);
          // Filter out users who are already in the "My Contacts" section, or are blocked
          const contactUids = new Set(contacts.map(c => c.uid));
          const hiddenUids = new Set([...blockedByMe, ...blockedByOther]);
          setSearchResults(results.filter(r => 
            !contactUids.has(r.uid) && 
            !hiddenUids.has(r.uid) && 
            r.uid !== auth.uid
          ));
        } catch (error) {
          console.error(error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const timeout = setTimeout(performSearch, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, contacts, auth.uid]);

  useEffect(() => {
    loadContacts();

    if (!auth.uid) return;

    const unsubRequests = subscribeToFriendRequests(auth.uid, (requests) => {
      setFriendRequests(requests);
    });

    const unsubFriends = subscribeToFriends(auth.uid, (friendIds) => {
      setFriends(friendIds);
    });

    const unsubSent = subscribeToSentRequests(auth.uid, (ids) => {
      setRequestedIds(ids);
    });

    const unsubBlockedMe = subscribeToBlockedUsers(auth.uid, (ids) => {
      setBlockedByMe(ids);
    });

    const unsubWhoBlocked = subscribeToWhoBlockedMe(auth.uid, (ids) => {
      setBlockedByOther(ids);
    });

    const unsubGroups = subscribeToGroups(auth.uid, (data) => {
      setGroups(data);
    });

    const unsubSecret = subscribeToSecretConversations(auth.uid, (ids) => {
      setSecretPartnerIds(ids);
    });

    return () => {
      unsubRequests();
      unsubFriends();
      unsubSent();
      unsubBlockedMe();
      unsubWhoBlocked();
      unsubGroups();
      unsubSecret();
    };
  }, [auth.uid]);

  useEffect(() => {
    const fetchMutuals = async () => {
      if (!auth.uid || friends.length === 0) return;
      const mutualMap: Record<string, number> = {};
      
      // For each friend, fetch mutual friends
      for (const friendId of friends) {
        try {
          const mutual = await getMutualFriends(auth.uid, friendId);
          mutualMap[friendId] = mutual.length;
        } catch (e) {
          console.error(e);
        }
      }
      setMutualFriends(mutualMap);
    };
    fetchMutuals();
  }, [friends, auth.uid]);

  useEffect(() => {
    const loadFriendProfiles = async () => {
      if (friends.length > 0) {
        try {
          const profiles = await fetchUsersByIds(friends);
          setFriendUsers(profiles);
        } catch (error) {
          console.error(error);
        }
      } else {
        setFriendUsers([]);
      }
    };
    loadFriendProfiles();
  }, [friends]);

  const loadContacts = async () => {
    try {
      const synced = await syncContacts();
      // Filter out self
      setContacts(synced.filter(c => c.uid !== auth.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (contact: ContactUser) => {
    try {
      await sendFriendRequest(contact.uid, auth.displayName || 'Anonymous', auth.photoURL || undefined);
      alert('Friend request sent!');
    } catch (error: any) {
      alert(error.message);
    }
  };
  const handleCancelRequest = async (contact: ContactUser) => {
    try {
      await cancelFriendRequest(contact.uid);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUnfriend = async (contact: ContactUser) => {
    Alert.alert(
      "Unfriend",
      `Are you sure you want to remove ${contact.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => {
          try {
            await unfriend(contact.uid);
          } catch (error: any) {
            alert(error.message);
          }
        }}
      ]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      alert("Please enter a group name and select at least one member.");
      return;
    }
    try {
      const groupId = await createGroup(groupName, selectedGroupMembers);
      
      // Auto-navigate to the new squad!
      navigation.navigate('Chat', { 
        group: { 
          id: groupId, 
          name: groupName, 
          memberIds: [...selectedGroupMembers, auth.uid] 
        } 
      });

      setGroupName('');
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
    } catch (e) {
      console.error(e);
      alert("Failed to create group.");
    }
  };

  const toggleMemberSelection = (uid: string) => {
    setSelectedGroupMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleResponse = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await respondToFriendRequest(requestId, status);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const RequestItem = ({ item }: { item: FriendRequest }) => (
    <View 
      className="mx-4 mb-4 p-5 rounded-[32px] flex-row items-center border shadow-xl"
      style={{ 
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF', 
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        shadowColor: primaryColor,
        shadowOpacity: 0.1,
        shadowRadius: 10
      }}
    >
      <View className="w-14 h-14 rounded-2xl items-center justify-center overflow-hidden border border-white/10" style={{ backgroundColor: surfaceHigh }}>
        {item.senderPhoto ? (
          <Image source={{ uri: item.senderPhoto }} className="w-full h-full" />
        ) : (
          <Text className="font-bold text-xl" style={{ color: primaryColor }}>{(item.senderName || '?').charAt(0)}</Text>
        )}
      </View>
      <View className="flex-1 ml-4">
        <View className="flex-row items-center">
           <Text className="font-black text-base" style={{ color: textColor }}>{item.senderName}</Text>
           <View className="ml-2 px-1.5 py-0.5 rounded-md bg-rose-500">
              <Text className="text-[7px] font-black text-white uppercase">New Request</Text>
           </View>
        </View>
        <Text className="text-xs font-medium" style={{ color: subTextColor }}>Wants to be your friend!</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity 
          onPress={() => handleResponse(item.id, 'accepted')}
          className="w-10 h-10 rounded-xl items-center justify-center mr-2 shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <Check size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleResponse(item.id, 'declined')}
          className="w-10 h-10 rounded-xl items-center justify-center border"
          style={{ backgroundColor: surfaceHigh, borderColor: 'rgba(255,0,0,0.1)' }}
        >
          <X size={20} color="#ff6e85" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const combinedList = useMemo(() => {
    const friendUids = new Set(friends);
    // 1. Start with people who are actually in the friend list (already fetched fully)
    const baseList = [...friendUsers];
    
    // 2. Add phone contacts who ARE NOT in the friend list yet
    const nonFriendContacts = filteredContacts.filter(c => !friendUids.has(c.uid));
    
    return [...baseList, ...nonFriendContacts];
  }, [friendUsers, filteredContacts, friends]);

  const renderItem = useCallback(({ item }: { item: ContactUser }) => {
    const isFriend = friends.includes(item.uid);
    const hasIncoming = friendRequests.some(r => r.fromId === item.uid);
    const wasRequested = requestedIds.includes(item.uid);
    const mutualCount = mutualFriends[item.uid] || 0;
    
    return (
      <TouchableOpacity 
        className="flex-row items-center px-4 py-4 rounded-xl mx-2 mb-1"
        onPress={() => {
          if (showCreateGroup) {
            if (isFriend) toggleMemberSelection(item.uid);
          } else {
            if (isFriend) {
               if (secretPartnerIds.includes(item.uid)) {
                   setPendingSecretUser(item);
                   setTempPassword('');
                   setShowPasswordText(false);
                   if (auth.secretPassword) setShowSecretLogin(true);
                   else setShowSecretSetup(true);
               } else {
                   navigation.navigate('Chat', { user: item });
               }
            } else {
               handleSendRequest(item);
            }
          }
        }}
        onLongPress={() => isFriend && handleUnfriend(item)}
        activeOpacity={0.7}
      >
        <View 
          className="w-12 h-12 rounded-full items-center justify-center overflow-hidden border"
          style={{ 
            backgroundColor: surfaceHigh,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}
        >
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} className="w-full h-full" />
          ) : (
            <Text className="font-bold text-lg" style={{ color: primaryColor }}>
              {(item.displayName || item.phoneNumber || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text className="font-semibold text-base" style={{ color: textColor }}>{item.displayName}</Text>
            {item.isFromContact && (
              <View className="ml-2 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                <Text className="text-[7px] font-black uppercase tracking-tighter" style={{ color: primaryColor }}>Contact</Text>
              </View>
            )}
            {showCreateGroup && isFriend && (
              <View className={`ml-2 w-5 h-5 rounded-full items-center justify-center border ${selectedGroupMembers.includes(item.uid) ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                 {selectedGroupMembers.includes(item.uid) && <Check size={12} color="white" />}
              </View>
            )}
          </View>
          <Text className="text-sm" style={{ color: subTextColor }}>
            {isFriend ? (mutualCount > 0 ? `${mutualCount} mutual friends` : 'Friend') : wasRequested ? 'Requested' : hasIncoming ? 'Sent you a request' : item.phoneNumber}
          </Text>
        </View>
        
        {!showCreateGroup && !isFriend && !hasIncoming && !wasRequested && (
          <TouchableOpacity 
            onPress={() => handleSendRequest(item)}
            className="bg-primary/10 px-4 py-2 rounded-full"
          >
            <Text className="text-primary font-bold text-xs">Add Friend</Text>
          </TouchableOpacity>
        )}
        {wasRequested && !isFriend && (
          <TouchableOpacity 
            onPress={() => handleCancelRequest(item)}
            className="bg-surface-container-highest px-4 py-2 rounded-full"
          >
            <Text className="text-onSurface-variant font-bold text-xs">Cancel</Text>
          </TouchableOpacity>
        )}
        {wasRequested && (
          <View className="w-10 h-10 items-center justify-center">
            <Clock size={20} color={subTextColor} />
          </View>
        )}
        {isFriend && !showCreateGroup && (
          <View className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center">
             <MessageCircle size={14} color={primaryColor} />
             <Text className="text-primary font-bold text-xs ml-1">Chat</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, friends, friendRequests, requestedIds, primaryColor, mutualFriends, showCreateGroup, selectedGroupMembers, isDarkMode, textColor, subTextColor, surfaceHigh]);

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {loading ? (
        <View className="flex-1 px-6 py-6">
           <View className="flex-row justify-between mb-8">
              {[1,2,3].map(i => <ShimmerPlaceholder key={i} width="30%" height={100} borderRadius={24} />)}
           </View>
           {[1,2,3,4,5].map(i => (
             <View key={i} className="flex-row items-center mb-6">
                <ShimmerPlaceholder width={48} height={48} borderRadius={24} />
                <View className="ml-4 flex-1">
                   <ShimmerPlaceholder width="40%" height={14} borderRadius={4} />
                   <ShimmerPlaceholder width="60%" height={10} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
             </View>
           ))}
        </View>
      ) : (
        <View style={getResponsiveContainerStyle()}>
          <FlatList
            data={[...combinedList, ...searchResults]}
            keyExtractor={(item) => item.uid}
            renderItem={renderItem}
            ListHeaderComponent={
              <>
                {!showCreateGroup ? (
                  <View className={`px-4 pt-4 pb-2 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                      {/* Social Hub Quick Actions */}
                      <View className="flex-row justify-between mb-6">
                         {[
                           { label: 'Add Friends', icon: UserPlus, color: '#3B82F6', onPress: () => {} },
                           { label: 'Scan QR', icon: Scan, color: '#10B981', onPress: openScanner },
                           { label: 'My QR', icon: QrCode, color: primaryColor, onPress: () => setShowMyQrModal(true) }
                         ].map((action, i) => (
                           <TouchableOpacity 
                            key={i}
                            onPress={action.onPress}
                            className="items-center p-3 rounded-3xl border flex-1 mx-1"
                            style={{ 
                              backgroundColor: surfaceLow, 
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
                            }}
                           >
                              <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: `${action.color}15` }}>
                                 <action.icon size={20} color={action.color} />
                              </View>
                              <Text className="text-[10px] font-black uppercase tracking-tighter" style={{ color: textColor }}>{action.label}</Text>
                           </TouchableOpacity>
                         ))}
                      </View>

                      {/* Your Friends Horizontal Section */}
                      {friendUsers.length > 0 && (
                        <View className="mb-6">
                           <View className="flex-row items-center justify-between mb-4 px-2">
                              <Text className="text-sm font-black uppercase tracking-[2px]" style={{ color: subTextColor }}>Top Friends</Text>
                              <TouchableOpacity><Text className="text-[10px] font-bold" style={{ color: primaryColor }}>View All</Text></TouchableOpacity>
                           </View>
                           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1">
                              {friendUsers.map(friend => (
                                <TouchableOpacity 
                                  key={friend.uid} 
                                  onPress={() => navigation.navigate('Chat', { user: friend })}
                                  className="items-center mr-6"
                                >
                                   <View 
                                    className="w-16 h-16 rounded-[24px] overflow-hidden border-2 p-0.5 shadow-lg"
                                    style={{ borderColor: primaryColor }}
                                   >
                                      <View className="flex-1 rounded-[21px] overflow-hidden bg-slate-200">
                                         {friend.photoURL ? (
                                           <Image source={{ uri: friend.photoURL }} className="w-full h-full" />
                                         ) : (
                                           <View className="flex-1 items-center justify-center"><Users size={24} color={primaryColor} /></View>
                                         )}
                                      </View>
                                   </View>
                                   <Text className="mt-2 text-[10px] font-black text-center" style={{ color: textColor }} numberOfLines={1}>{friend.displayName.split(' ')[0]}</Text>
                                </TouchableOpacity>
                              ))}
                           </ScrollView>
                        </View>
                      )}

                      <TouchableOpacity 
                       onPress={() => setShowCreateGroup(true)}
                       className="p-4 rounded-3xl flex-row items-center justify-center border shadow-sm"
                       style={{ 
                         backgroundColor: primaryColor, 
                         borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' 
                       }}
                      >
                         <Users size={20} color="white" />
                         <Text className="ml-2 font-black text-sm uppercase tracking-widest text-white">Create New Squad</Text>
                      </TouchableOpacity>
                  </View>
                ) : (
                  <View 
                    className={`px-6 py-6 border-b mx-4 mt-2 rounded-[32px] ${isTablet ? 'max-w-md self-center w-full' : ''}`}
                    style={{ backgroundColor: surfaceLow, borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                     <View className="flex-row justify-between items-center mb-4">
                        <Text className="font-black text-lg" style={{ color: textColor }}>Create Squad</Text>
                        <TouchableOpacity onPress={() => { setShowCreateGroup(false); setSelectedGroupMembers([]); setGroupName(''); }}>
                           <X size={20} color={subTextColor} />
                        </TouchableOpacity>
                     </View>
                     <TextInput 
                        className="px-6 py-4 rounded-2xl font-bold border mb-4"
                        style={{ 
                          backgroundColor: surfaceHigh, 
                          color: textColor,
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }}
                        placeholder="Squad Name..."
                        placeholderTextColor={subTextColor}
                        value={groupName}
                        onChangeText={setGroupName}
                     />
                     <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold" style={{ color: subTextColor }}>{selectedGroupMembers.length} friends selected</Text>
                        <TouchableOpacity 
                          onPress={handleCreateGroup}
                          className="px-6 py-3 rounded-full shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                           <Text className="font-black text-xs uppercase" style={{ color: getContrastText(primaryColor) }}>Create</Text>
                        </TouchableOpacity>
                     </View>
                  </View>
                )}

                {groups.length > 0 && !showCreateGroup && (
                  <View className={`py-2 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                     <View className="flex-row items-center px-6 py-3">
                        <Users size={18} color={primaryColor} />
                        <Text className="ml-2 text-sm font-bold uppercase tracking-widest" style={{ color: subTextColor }}>My Squads</Text>
                     </View>
                     <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
                        {groups.map(group => (
                          <TouchableOpacity 
                            key={group.id} 
                            onPress={() => navigation.navigate('Chat', { group })}
                            className="items-center mr-6"
                          >
                             <View 
                                className="w-16 h-16 rounded-3xl items-center justify-center border mb-2 shadow-sm"
                                style={{ backgroundColor: surfaceHigh, borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                             >
                                <Users size={24} color={primaryColor} />
                             </View>
                             <Text className="font-bold text-xs" numberOfLines={1} style={{ color: textColor }}>{group.name}</Text>
                          </TouchableOpacity>
                        ))}
                     </ScrollView>
                  </View>
                )}
                {friendRequests.length > 0 && (
                  <View className={`py-2 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                    <View className="flex-row items-center px-6 py-3">
                      <Users size={18} color={primaryColor} />
                      <Text className="ml-2 text-sm font-bold uppercase tracking-widest" style={{ color: subTextColor }}>
                        New Friend Requests ({friendRequests.length})
                      </Text>
                    </View>
                    {friendRequests.map(req => <RequestItem key={req.id} item={req} />)}
                  </View>
                )}
                {combinedList.length > 0 && (
                  <View className={`px-6 py-2 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                    <Text className="text-sm font-bold uppercase tracking-widest" style={{ color: subTextColor }}>
                      Your Contacts & Friends
                    </Text>
                  </View>
                )}
                {searching ? (
                  <View className="p-10 items-center">
                     <ActivityIndicator color={primaryColor} />
                     <Text className="mt-2" style={{ color: subTextColor }}>Searching Global Users...</Text>
                  </View>
                ) : searchResults.length > 0 && (
                  <View className={`px-6 py-4 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                    <Text className="text-sm font-bold uppercase tracking-widest" style={{ color: subTextColor }}>
                      Global Results
                    </Text>
                  </View>
                )}
              </>
            }
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center mt-10 px-10">
                <Text className="text-center" style={{ color: subTextColor }}>No registered contacts found. Invite your friends!</Text>
              </View>
            }
          />
        </View>
      )}

      {/* SETUP SECRET PASSWORD MODAL */}
      <Modal animationType="fade" transparent={true} visible={showSecretSetup} onRequestClose={() => setShowSecretSetup(false)}>
          <TouchableOpacity className="flex-1 bg-black/80 items-center justify-center p-6" activeOpacity={1} onPress={() => setShowSecretSetup(false)}>
              <View className={`rounded-[40px] p-8 w-full ${isTablet ? 'max-w-md' : ''}`} style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                  <View className="items-center mb-6">
                      <View className="w-16 h-16 rounded-full items-center justify-center mb-4 border border-rose-500/20" style={{ backgroundColor: `rgba(244, 63, 94, 0.1)` }}>
                          <Shield size={32} color="#f43f5e" />
                      </View>
                      <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Setup Secret Lock</Text>
                      <Text className="text-sm mt-2 text-center leading-5" style={{ color: subTextColor }}>Protect your hidden conversations. Set a master password to access this chat.</Text>
                  </View>

                  <View className="w-full relative justify-center mb-6">
                      <TextInput
                          className="w-full py-4 pl-6 pr-14 rounded-2xl text-xl font-bold"
                          style={{ backgroundColor: surfaceLow, color: textColor }}
                          placeholder="Create Password"
                          placeholderTextColor={subTextColor}
                          secureTextEntry={!showPasswordText}
                          autoCapitalize="none"
                          autoCorrect={false}
                          value={tempPassword}
                          onChangeText={setTempPassword}
                          autoFocus
                      />
                      <TouchableOpacity onPress={() => setShowPasswordText(!showPasswordText)} className="absolute right-4 p-2">
                          {showPasswordText ? <EyeOff size={20} color={subTextColor} /> : <Eye size={20} color={subTextColor} />}
                      </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleSetupSecretPassword} className="w-full py-4 rounded-2xl items-center bg-rose-500 shadow-lg shadow-rose-500/30">
                      <Text className="text-white font-bold text-base uppercase tracking-widest">Save Password</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* LOGIN SECRET PASSWORD MODAL */}
      <Modal animationType="fade" transparent={true} visible={showSecretLogin} onRequestClose={() => setShowSecretLogin(false)}>
          <TouchableOpacity className="flex-1 bg-black/90 items-center justify-center p-6" activeOpacity={1} onPress={() => setShowSecretLogin(false)}>
              <View className={`rounded-[40px] border border-rose-500/20 p-8 w-full ${isTablet ? 'max-w-md' : ''}`} style={{ backgroundColor: isDarkMode ? '#050505' : '#FFFFFF' }} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                  <View className="items-center mb-6">
                      <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-rose-500/10">
                          <Lock size={32} color="#f43f5e" />
                      </View>
                      <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Secret Chat</Text>
                      <Text className="text-sm mt-1 text-center" style={{ color: subTextColor }}>Enter your password to unlock.</Text>
                  </View>

                  <View className="w-full relative justify-center mb-6">
                      <TextInput
                          className="w-full py-4 pl-6 pr-14 rounded-2xl text-xl font-bold border border-rose-500/10"
                          style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#F5F5F5', color: textColor }}
                          placeholder="Password"
                          placeholderTextColor={subTextColor}
                          secureTextEntry={!showPasswordText}
                          autoCapitalize="none"
                          autoCorrect={false}
                          value={tempPassword}
                          onChangeText={setTempPassword}
                          autoFocus
                      />
                      <TouchableOpacity onPress={() => setShowPasswordText(!showPasswordText)} className="absolute right-4 p-2">
                          {showPasswordText ? <EyeOff size={20} color={subTextColor} /> : <Eye size={20} color={subTextColor} />}
                      </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleVerifySecretPassword} className="w-full py-4 rounded-2xl items-center bg-rose-500 shadow-xl shadow-rose-500/30">
                      <Text className="text-white font-bold text-base uppercase tracking-widest">Unlock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleForgotPassword} className="w-full mt-4 items-center">
                      <Text className="text-sm font-bold" style={{ color: '#f43f5e' }}>Forgot Password?</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* MY QR MODAL */}
      <Modal animationType="slide" transparent={true} visible={showMyQrModal} onRequestClose={() => setShowMyQrModal(false)}>
          <View className="flex-1 bg-black/80 items-center justify-center p-6">
              <View className={`rounded-[48px] p-8 w-full ${isTablet ? 'max-w-md' : ''}`} style={{ backgroundColor: isDarkMode ? '#1a1c1e' : '#FFFFFF' }}>
                  <View className="items-center mb-8">
                      <View className="w-20 h-20 rounded-3xl overflow-hidden border-2 mb-4 p-1" style={{ borderColor: primaryColor }}>
                          <View className="flex-1 rounded-[1.2rem] overflow-hidden bg-slate-100">
                              {auth.photoURL ? <Image source={{ uri: auth.photoURL }} className="w-full h-full" /> : <Users size={40} color={primaryColor} /> }
                          </View>
                      </View>
                      <Text className="text-2xl font-black" style={{ color: textColor }}>{auth.displayName}</Text>
                      <Text className="text-sm font-bold opacity-50" style={{ color: textColor }}>Your Unique ChatSnap Code</Text>
                  </View>

                  <View className="items-center p-8 rounded-[40px] mb-8 shadow-2xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F5F7FF' }}>
                      <QRCode value={`chatsnap:user:${auth.uid}`} size={200} color={primaryColor} backgroundColor="transparent" />
                  </View>

                  <TouchableOpacity onPress={() => setShowMyQrModal(false)} className="w-full py-5 rounded-[24px] items-center" style={{ backgroundColor: primaryColor }}>
                      <Text className="text-white font-black uppercase tracking-widest">Back to Contacts</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* SCAN QR MODAL */}
      <Modal animationType="slide" visible={showScanModal} onRequestClose={() => setShowScanModal(false)}>
          <View style={StyleSheet.absoluteFill}>
              <CameraView 
                style={StyleSheet.absoluteFill} 
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              
              {/* Scanning Overlay */}
              <View style={styles.overlay}>
                  <View className="items-center mb-20">
                      <Text className="text-white text-2xl font-black mb-2">Scan QR Code</Text>
                      <Text className="text-white/60 font-bold">Align the square with your friend's code</Text>
                  </View>
                  
                  <View style={[styles.scanFrame, { borderColor: primaryColor }]}>
                      <View style={[styles.corner, styles.topLeft, { borderColor: primaryColor }]} />
                      <View style={[styles.corner, styles.topRight, { borderColor: primaryColor }]} />
                      <View style={[styles.corner, styles.bottomLeft, { borderColor: primaryColor }]} />
                      <View style={[styles.corner, styles.bottomRight, { borderColor: primaryColor }]} />
                  </View>

                  <TouchableOpacity 
                    onPress={() => setShowScanModal(false)}
                    className="mt-20 w-16 h-16 rounded-full items-center justify-center bg-black/40 border border-white/20"
                  >
                      <X size={32} color="white" />
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
};

export default ContactsScreen;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 0,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRadius: 12,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
