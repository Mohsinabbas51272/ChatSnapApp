import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MessageSquare, Camera, Lock, MessageCircle } from 'lucide-react-native';
import { subscribeToConversations, subscribeToSecretConversations } from '../services/messaging';
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp,
  doc, updateDoc, getDoc, getDocs, arrayUnion, arrayRemove, deleteDoc, limit
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import Header from './ui/Header';
import { subscribeToGroupConversations } from '../services/groups';
import { Users, Info } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';

interface Conversation {
  partnerId: string;
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
    status?: 'online' | 'offline';
  };
  lastMessage: {
    text: string;
    timestamp: Date;
    type: 'text' | 'snap' | 'voice';
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
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';

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
              globalUserDetailsCache.set(conv.partnerId, { ...current, status: data.status });
              setConversations(prev => prev.map(c => 
                (!c.isGroup && c.partnerId === conv.partnerId) ? { ...c, user: { ...c.user, status: data.status } } : c
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
              {item.isGroup ? `${item.lastMessage.senderName}: ${item.lastMessage.text}` :
               item.lastMessage.type === 'snap' ? (item.unreadCount > 0 ? 'New Snap • Tap to view' : 'Snap') : 
               item.lastMessage.type === 'voice' ? 'Voice note' : item.lastMessage.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [navigation, primaryColor, secretPartnerIds, isDarkMode, surfaceHigh, textColor, subTextColor]);

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {loading && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
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
                  onPress={() => setViewMode('secret')}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl mx-1`}
                  style={{ backgroundColor: viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.05)' : `${primaryColor}20`) : surfaceLow }}
                  activeOpacity={0.7}
                >
                  <Lock size={16} color={viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor} />
                  <Text className={`ml-2 font-bold text-xs`} style={{ color: viewMode === 'secret' ? (isLightColor(primaryColor) && !isDarkMode ? getContrastText(primaryColor) : primaryColor) : subTextColor }}>Secret</Text>
                </TouchableOpacity>
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
    </View>
  );
};

export default ConversationsList;
