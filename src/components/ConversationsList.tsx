import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MessageSquare, Camera } from 'lucide-react-native';
import { subscribeToConversations, subscribeToSecretConversations } from '../services/messaging';
import { db } from '../services/firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Header from './ui/Header';

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
  };
  unreadCount: number;
}

import Animated, { FadeInLeft } from 'react-native-reanimated';

// Store user details globally to prevent re-fetching on Every tab switch
const globalUserDetailsCache = new Map<string, any>();
const globalStatusUnsubscribers = new Map<string, () => void>();

const ConversationsList = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretPartnerIds, setSecretPartnerIds] = useState<string[]>([]);
  const [showSecretChats, setShowSecretChats] = useState(false);
  const navigation = useNavigation<any>();
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const filteredConversations = useMemo(() => conversations.filter(conv => {
    const matchesSearch = (conv.user?.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const isSecret = secretPartnerIds.includes(conv.partnerId);
    if (showSecretChats) return matchesSearch && isSecret;
    return matchesSearch && !isSecret;
  }), [conversations, searchQuery, secretPartnerIds, showSecretChats]);

  useEffect(() => {
    if (!currentUser.uid) return;

    const unsubscribe = subscribeToConversations(currentUser.uid, async (convs) => {
      // First set conversations with what we have (even if missing user details)
      // This makes the UI feel much faster
      setConversations(prev => {
        return convs.map(c => {
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
      });

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
              // Update global cache too
              const current = globalUserDetailsCache.get(conv.partnerId) || {};
              globalUserDetailsCache.set(conv.partnerId, { ...current, status: data.status });

              setConversations(prev => prev.map(c => 
                c.partnerId === conv.partnerId ? { ...c, user: { ...c.user, status: data.status } } : c
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
      
      setConversations(detailedConvs);
      setLoading(false);
    });

    const unsubscribeSecret = subscribeToSecretConversations(currentUser.uid, (ids) => {
      setSecretPartnerIds(ids);
    });

    return () => {
      unsubscribe();
      unsubscribeSecret();
      // Keep globalUserDetailsCache to prevent re-fetching on tab switch
    };
  }, [currentUser.uid]);

  const renderItem = useCallback(({ item, index }: { item: Conversation; index: number }) => (
    <Animated.View entering={FadeInLeft.delay(index * 50).duration(400)}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('Chat', { user: item.user })}
        className={`flex-row items-center px-4 py-4 rounded-2xl mx-2 mb-1 ${item.unreadCount > 0 ? 'bg-surface-container-high/40' : ''}`}
        activeOpacity={0.7}
      >
        {/* Unread indicator pill */}
        {item.unreadCount > 0 && (
          <View className="absolute left-0 w-1 h-10 bg-primary rounded-r-full" />
        )}
        
        <View>
          <View className={`w-14 h-14 rounded-full items-center justify-center overflow-hidden ${
            item.unreadCount > 0 
              ? 'p-[2px]' 
              : 'bg-surface-container-highest border-2 border-outline-variant/20'
          }`}
          style={item.unreadCount > 0 ? {
            borderWidth: 2,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          } : undefined}
          >
            {item.unreadCount > 0 ? (
              <View className="w-full h-full rounded-full overflow-hidden" style={{
                borderWidth: 2,
                borderColor: primaryColor,
              }}>
                {item.user.photoURL ? (
                  <Image source={{ uri: item.user.photoURL }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full bg-surface-container items-center justify-center">
                    <Text className="text-onSurface font-black text-xl">{(item.user.displayName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            ) : (
              item.user.photoURL ? (
                <Image source={{ uri: item.user.photoURL }} className="w-full h-full" />
              ) : (
                <Text className="text-onSurface font-black text-xl">{(item.user.displayName || '?').charAt(0).toUpperCase()}</Text>
              )
            )}
          </View>
          {item.user.status === 'online' && (
            <View 
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface" 
              style={{ backgroundColor: '#10B981' }}
            />
          )}
        </View>
        
        <View className="flex-1 ml-4">
          <View className="flex-row justify-between items-baseline mb-1">
            <Text className={`text-lg tracking-tight ${item.unreadCount > 0 ? 'font-bold text-onSurface' : 'font-semibold text-onSurface/90'}`}>
              {item.user.displayName}
            </Text>
            <Text className={`text-[11px] tracking-tight ${item.unreadCount > 0 ? 'font-bold text-primary' : 'font-medium text-onSurface-variant'}`}>
               {item.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            {item.lastMessage.type === 'snap' ? (
              <Camera size={14} color={item.lastMessage.viewed ? '#64748B' : primaryColor} />
            ) : null}
            <Text 
              numberOfLines={1} 
              className={`flex-1 ml-1 text-sm ${item.unreadCount > 0 ? 'font-bold text-primary tracking-tight' : 'text-onSurface-variant'}`}
            >
              {item.lastMessage.type === 'snap' ? (item.unreadCount > 0 ? 'New Snap • Tap to view' : 'Snap') : 
               item.lastMessage.type === 'voice' ? 'Voice note' : item.lastMessage.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [navigation, primaryColor, secretPartnerIds]);

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {loading && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.partnerId}
          renderItem={renderItem}
          className="bg-surface"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20 px-8">
              <View className="bg-surface-container-highest p-6 rounded-full mb-4">
                <MessageSquare size={48} color="#464752" />
              </View>
              <Text className="text-xl font-bold text-onSurface">No Chats Yet</Text>
              <Text className="text-onSurface-variant text-center mt-2">Start a conversation with your friends in the Contacts tab!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ConversationsList;
