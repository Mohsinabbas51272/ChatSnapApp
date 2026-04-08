import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { MessageSquare, Camera, Lock, MessageCircle, Shield, Eye, EyeOff, Plus, Smile, Users } from 'lucide-react-native';
import ShimmerPlaceholder from './ui/ShimmerPlaceholder';
import { subscribeToConversations, subscribeToSecretConversations } from '../services/messaging';
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp,
  doc, updateDoc, getDoc, getDocs, arrayUnion, arrayRemove, deleteDoc, limit
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import Header from './ui/Header';
import { subscribeToGroupConversations } from '../services/groups';
import { Info } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';

interface Conversation {
  partnerId: string;
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
    status?: 'online' | 'offline';
    moodStatus?: {
      text: string;
      emoji: string;
      expiresAt: any;
    };
  };
  lastMessage: {
    text: string;
    timestamp: Date;
    type: 'text' | 'snap' | 'voice' | 'image' | 'document';
    viewed?: boolean;
    senderId: string;
    senderName?: string;
  };
  unreadCount: number;
  isGroup?: boolean;
  group?: any;
}

import Animated, { FadeInLeft } from 'react-native-reanimated';

// Store user details globally to prevent re-fetching on Every tab switch
const globalUserDetailsCache = new Map<string, any>();
const globalStatusUnsubscribers = new Map<string, () => void>();

const ConversationsList = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretPartnerIds, setSecretPartnerIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'private' | 'groups' | 'secret'>('private');
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();

  // Secret Password State
  const [showSecretSetup, setShowSecretSetup] = useState(false);
  const [showSecretLogin, setShowSecretLogin] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

  const handleSecretTabPress = useCallback(() => {
    if (viewMode === 'secret') return;
    setTempPassword('');
    setShowPasswordText(false);
    
    if (currentUser.secretPassword) {
      setShowSecretLogin(true);
    } else {
      setShowSecretSetup(true);
    }
  }, [viewMode, currentUser.secretPassword]);

  const handleSetupSecretPassword = async () => {
    if (tempPassword.length < 4) {
       Alert.alert("Weak Password", "Secret password must be at least 4 characters long.");
       return;
    }
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid!), {
        secretPassword: tempPassword
      });
      // Dynamically update redux state to avoid full refetch
      dispatch({ type: 'auth/setUser', payload: { ...currentUser, secretPassword: tempPassword } });
      setShowSecretSetup(false);
      setTempPassword('');
      setViewMode('secret');
    } catch (e: any) {
      Alert.alert("Error", "Could not save password. Please try again.");
    }
  };

  const handleVerifySecretPassword = () => {
    if (tempPassword === currentUser.secretPassword) {
      setShowSecretLogin(false);
      setTempPassword('');
      setViewMode('secret');
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
            await updateDoc(doc(db, 'users', currentUser.uid!), { secretPassword: null });
            dispatch({ type: 'auth/setUser', payload: { ...currentUser, secretPassword: null } });
            setShowSecretLogin(false);
            setTempPassword('');
            setShowPasswordText(false);
            setTimeout(() => setShowSecretSetup(true), 400);
          } catch (e: any) {
            Alert.alert("Error", "Could not reset password.");
          }
        }}
      ]
    );
  };

  const filteredConversations = useMemo(() => conversations.filter(conv => {
    const title = conv.isGroup ? conv.group.name : (conv.user?.displayName || '');
    const matchesSearch = title.toLowerCase().includes((searchQuery || '').toLowerCase());
    if (!matchesSearch) return false;

    const isSecret = !conv.isGroup && secretPartnerIds.includes(conv.partnerId);

    if (viewMode === 'groups') return conv.isGroup;
    if (viewMode === 'secret') return isSecret;
    // Default to 'private': not group and not secret
    return !conv.isGroup && !isSecret;
  }), [conversations, searchQuery, secretPartnerIds, viewMode]);

  useEffect(() => {
    if (!currentUser.uid) return;

    let privateConvs: Conversation[] = [];
    let groupConvs: Conversation[] = [];

    const mergeAndSet = () => {
      const merged = [...privateConvs, ...groupConvs];
      merged.sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime());
      setConversations(merged);
    };

    const unsubscribePrivate = subscribeToConversations(currentUser.uid, async (convs) => {
      privateConvs = convs.map(c => {
        const cached = globalUserDetailsCache.get(c.partnerId);
        return {
          ...c,
          user: cached ? {
            uid: c.partnerId,
            displayName: cached.displayName,
            photoURL: cached.photoURL,
            status: cached.status || 'offline',
          } : {
            uid: c.partnerId,
            displayName: 'Loading...',
            status: 'offline'
          }
        };
      });
      mergeAndSet();

      const detailedConvs = await Promise.all(convs.map(async (conv) => {
        let userData = globalUserDetailsCache.get(conv.partnerId);
        if (!userData) {
          try {
            const userDoc = await getDoc(doc(db, 'users', conv.partnerId));
            userData = userDoc.exists() ? userDoc.data() : { displayName: 'Unknown User', status: 'offline' };
            globalUserDetailsCache.set(conv.partnerId, userData);
          } catch (e) {
            userData = { displayName: 'User', status: 'offline' };
          }
        }
        
        if (!globalStatusUnsubscribers.has(conv.partnerId)) {
          const unsub = onSnapshot(doc(db, 'users', conv.partnerId), (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              const current = globalUserDetailsCache.get(conv.partnerId) || {};
              globalUserDetailsCache.set(conv.partnerId, { 
                ...current, 
                status: data.status,
                moodStatus: data.moodStatus 
              });
              setConversations(prev => prev.map(c => 
                (!c.isGroup && c.partnerId === conv.partnerId) ? { ...c, user: { ...c.user, status: data.status, moodStatus: data.moodStatus } } : c
              ));
            }
          }, (error) => {
            console.warn('Snapshot error in User Status listener:', error.message);
          });
          globalStatusUnsubscribers.set(conv.partnerId, unsub);
        }

        return {
          ...conv,
          user: {
            uid: conv.partnerId,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            status: userData.status || 'offline',
            moodStatus: userData.moodStatus,
          }
        };
      }));
      
      privateConvs = detailedConvs;
      mergeAndSet();
      setLoading(false);
    });

    const unsubscribeGroups = subscribeToGroupConversations(currentUser.uid, (groups) => {
      groupConvs = groups;
      mergeAndSet();
    });

    const unsubscribeSecret = subscribeToSecretConversations(currentUser.uid, (ids) => {
      setSecretPartnerIds(ids);
    });

    return () => {
      unsubscribePrivate();
      unsubscribeGroups();
      unsubscribeSecret();
    };
  }, [currentUser.uid]);

  const renderItem = useCallback(({ item, index }: { item: Conversation; index: number }) => (
    <Animated.View entering={FadeInLeft.delay(index * 50).duration(400)}>
      <TouchableOpacity 
        onPress={() => item.isGroup ? navigation.navigate('Chat', { group: item.group }) : navigation.navigate('Chat', { user: item.user })}
        className={`flex-row items-center px-4 py-4 rounded-2xl mx-2 mb-1`}
        style={{ 
          backgroundColor: item.unreadCount > 0 ? (isDarkMode ? 'rgba(155,168,255,0.1)' : 'rgba(155,168,255,0.05)') : 'transparent' 
        }}
        activeOpacity={0.7}
      >
        {item.unreadCount > 0 && (
          <View className="absolute left-0 w-1 h-10 bg-primary rounded-r-full" />
        )}
        
        <View>
          <View className={`w-14 h-14 rounded-full items-center justify-center overflow-hidden ${
            item.unreadCount > 0 
              ? 'p-[2px]' 
              : ''
          }`}
          style={item.unreadCount > 0 ? {
            borderWidth: 2,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          } : {
            backgroundColor: surfaceHigh,
            borderWidth: 2,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }}
          >
            {item.isGroup ? (
              <View className="w-full h-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                <Users color={primaryColor} size={28} />
              </View>
            ) : item.unreadCount > 0 ? (
              <View className="w-full h-full rounded-full overflow-hidden" style={{
                borderWidth: 2,
                borderColor: primaryColor,
              }}>
                {item.user.photoURL ? (
                  <Image source={{ uri: item.user.photoURL }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full items-center justify-center" style={{ backgroundColor: surfaceHigh }}>
                    <Text className="font-black text-xl" style={{ color: textColor }}>{(item.user.displayName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            ) : (
              item.user.photoURL ? (
                <Image source={{ uri: item.user.photoURL }} className="w-full h-full" />
              ) : (
                <Text className="font-black text-xl" style={{ color: textColor }}>{(item.user.displayName || '?').charAt(0).toUpperCase()}</Text>
              )
            )}
          </View>
          {!item.isGroup && item.user.status === 'online' && (
            <View 
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2" 
              style={{ backgroundColor: '#10B981', borderColor: isDarkMode ? '#0f111a' : '#F8F9FF' }}
            />
          )}
        </View>
        
        <View className="flex-1 ml-4">
          <View className="flex-row justify-between items-baseline mb-1">
            <Text className={`text-lg tracking-tight ${item.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`} style={{ color: item.unreadCount > 0 ? textColor : (isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)') }}>
              {item.isGroup ? item.group.name : item.user.displayName}
            </Text>
            <Text 
              className={`text-[11px] tracking-tight ${item.unreadCount > 0 ? 'font-bold' : 'font-medium'}`}
              style={{ color: item.unreadCount > 0 ? primaryColor : subTextColor }}
            >
               {item.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            {item.lastMessage.type === 'snap' ? (
              <Camera size={14} color={item.lastMessage.viewed ? (isDarkMode ? '#64748B' : '#94A3B8') : primaryColor} />
            ) : null}
            <Text 
              numberOfLines={1} 
              className={`flex-1 ml-1 text-sm ${item.unreadCount > 0 ? 'font-bold tracking-tight' : ''}`}
              style={{ color: item.unreadCount > 0 ? primaryColor : subTextColor }}
            >
              {item.isGroup ? `${item.lastMessage.senderName}: ${
                  item.lastMessage.type === 'image' ? 'Photo' : 
                  item.lastMessage.type === 'document' ? 'Document' : 
                  item.lastMessage.type === 'snap' ? 'Snap' : 
                  item.lastMessage.type === 'voice' ? 'Voice note' : 
                  item.lastMessage.text
                }` :
               item.lastMessage.type === 'snap' ? (item.unreadCount > 0 ? 'New Snap • Tap to view' : 'Snap') : 
               item.lastMessage.type === 'image' ? (item.unreadCount > 0 ? 'New Photo • Tap to view' : 'Photo') :
               item.lastMessage.type === 'document' ? (item.unreadCount > 0 ? 'New Document • Tap to view' : 'Document') :
               item.lastMessage.type === 'voice' ? 'Voice note' : item.lastMessage.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [navigation, primaryColor, secretPartnerIds, isDarkMode, surfaceHigh, textColor, subTextColor]);

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      
      {loading && conversations.length === 0 ? (
        <View className="flex-1 px-4 py-4">
           {[1,2,3,4,5,6,7,8].map(i => (
             <View key={i} className="flex-row items-center mb-6">
                <ShimmerPlaceholder width={56} height={56} borderRadius={28} />
                <View className="ml-4 flex-1">
                   <ShimmerPlaceholder width="40%" height={14} borderRadius={4} />
                   <ShimmerPlaceholder width="80%" height={10} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
             </View>
           ))}
        </View>
      ) : (
        <View style={getResponsiveContainerStyle()}>
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.partnerId || item.group?.id || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 100, paddingHorizontal: isTablet ? 0 : 8 }}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListHeaderComponent={
              <View>
                <View className={`flex-row items-center justify-around px-2 py-3 mb-2 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                <TouchableOpacity
                  onPress={() => setViewMode('private')}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl mx-1`}
                  style={{ backgroundColor: viewMode === 'private' ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.05)' : `${primaryColor}20`) : surfaceLow }}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={16} color={viewMode === 'private' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor} />
                  <Text className={`ml-2 font-bold text-xs`} style={{ color: viewMode === 'private' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor }}>Chats</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setViewMode('groups')}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl mx-1`}
                  style={{ backgroundColor: viewMode === 'groups' ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.05)' : `${primaryColor}20`) : surfaceLow }}
                  activeOpacity={0.7}
                >
                  <Users size={16} color={viewMode === 'groups' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor} />
                  <Text className={`ml-2 font-bold text-xs`} style={{ color: viewMode === 'groups' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor }}>Groups</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleSecretTabPress}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl mx-1`}
                  style={{ backgroundColor: viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.05)' : `${primaryColor}20`) : surfaceLow }}
                  activeOpacity={0.7}
                >
                  <Lock size={16} color={viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor} />
                  <Text className={`ml-2 font-bold text-xs`} style={{ color: viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor }}>Secret</Text>
                </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center mt-20 px-8">
                <View className="p-6 rounded-full mb-4" style={{ backgroundColor: surfaceHigh }}>
                  {viewMode === 'secret' ? (
                    <Lock size={48} color={primaryColor} />
                  ) : viewMode === 'groups' ? (
                    <Users size={48} color={primaryColor} />
                  ) : (
                    <MessageSquare size={48} color={primaryColor} />
                  )}
                </View>
                <Text className="text-xl font-bold" style={{ color: textColor }}>
                  {viewMode === 'secret' ? 'No Secret Chats' : viewMode === 'groups' ? 'No Groups Found' : 'No Chats Yet'}
                </Text>
                <Text className="text-center mt-2 mb-8 text-sm" style={{ color: subTextColor }}>
                  {viewMode === 'secret' 
                    ? 'Enable secret mode in a chat to hide it here' 
                    : viewMode === 'groups'
                    ? 'Join or create a group to start community chats'
                    : 'Start a conversation with your friends in the Contacts tab!'}
                </Text>
                
                {viewMode === 'private' && (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Contacts')}
                    className="bg-primary px-8 py-4 rounded-3xl shadow-lg"
                    style={{ shadowColor: primaryColor }}
                  >
                    <Text className="text-white font-black uppercase tracking-widest text-xs">Find Friends</Text>
                  </TouchableOpacity>
                )}
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
                      <Text className="text-sm mt-2 text-center leading-5" style={{ color: subTextColor }}>Protect your hidden conversations. Set a master password to access the Secret tab.</Text>
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
                      <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Secret Chats</Text>
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

    </View>
  );
};

export default ConversationsList;
