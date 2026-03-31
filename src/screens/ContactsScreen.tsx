import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/ui/Header';
import { syncContacts, ContactUser, searchUsers } from '../services/contacts';
import { 
  sendFriendRequest, 
  subscribeToFriendRequests, 
  subscribeToFriends, 
  respondToFriendRequest,
  subscribeToSentRequests,
  FriendRequest
} from '../services/social';
import { fetchUsersByIds } from '../services/contacts';
import { useNavigation } from '@react-navigation/native';
import { UserPlus, UserCheck, Clock, Check, X, Users, MessageCircle } from 'lucide-react-native';

import { useSelector } from 'react-redux';
import { RootState } from '../store';

const ContactsScreen = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
  const [friendUsers, setFriendUsers] = useState<ContactUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const auth = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation<any>();

  const filteredContacts = useMemo(() => contacts.filter(contact => 
    (contact.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (contact.phoneNumber || '').includes(searchQuery || '')
  ), [contacts, searchQuery]);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          // Get global results
          const results = await searchUsers(searchQuery);
          // Filter out users who are already in the "My Contacts" section
          const contactUids = new Set(contacts.map(c => c.uid));
          setSearchResults(results.filter(r => !contactUids.has(r.uid) && r.uid !== auth.uid));
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

    return () => {
      unsubRequests();
      unsubFriends();
      unsubSent();
    };
  }, [auth.uid]);

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

  const handleResponse = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await respondToFriendRequest(requestId, status);
    } catch (error: any) {
      console.error(error);
    }
  };

  const RequestItem = ({ item }: { item: FriendRequest }) => (
    <View className="bg-surface-container-low mx-4 mb-3 p-4 rounded-2xl flex-row items-center border border-outline-variant/10 shadow-sm">
      <View className="w-10 h-10 bg-surface-container-highest rounded-full items-center justify-center overflow-hidden">
        {item.senderPhoto ? (
          <Image source={{ uri: item.senderPhoto }} className="w-full h-full" />
        ) : (
          <Text className="text-primary font-bold">{(item.senderName || '?').charAt(0)}</Text>
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-onSurface font-bold text-sm">{item.senderName}</Text>
        <Text className="text-onSurface-variant text-xs">Sent a friend request</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity 
          onPress={() => handleResponse(item.id, 'accepted')}
          className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2"
        >
          <Check size={16} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleResponse(item.id, 'declined')}
          className="w-8 h-8 rounded-full bg-surface-container-highest items-center justify-center"
        >
          <X size={16} color="#ff6e85" />
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
    
    return (
      <TouchableOpacity 
        className="flex-row items-center px-4 py-4 rounded-xl mx-2 mb-1"
        onPress={() => isFriend ? navigation.navigate('Chat', { user: item }) : handleSendRequest(item)}
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 bg-surface-container-highest rounded-full items-center justify-center overflow-hidden border border-outline-variant/20">
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} className="w-full h-full" />
          ) : (
            <Text className="text-primary font-bold text-lg">
              {(item.displayName || item.phoneNumber || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text className="text-onSurface font-semibold text-base">{item.displayName}</Text>
            {item.isFromContact && (
              <View className="ml-2 bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] text-primary font-bold uppercase">My Contact</Text>
              </View>
            )}
          </View>
          <Text className="text-onSurface-variant text-sm">
            {isFriend ? 'Friend' : wasRequested ? 'Requested' : hasIncoming ? 'Sent you a request' : item.phoneNumber}
          </Text>
        </View>
        
        {!isFriend && !hasIncoming && !wasRequested && (
          <TouchableOpacity 
            onPress={() => handleSendRequest(item)}
            className="bg-primary/10 px-4 py-2 rounded-full"
          >
            <Text className="text-primary font-bold text-xs">Add Friend</Text>
          </TouchableOpacity>
        )}
        {wasRequested && (
          <View className="w-10 h-10 items-center justify-center">
            <Clock size={20} color="#94a3b8" />
          </View>
        )}
        {isFriend && (
          <View className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center">
             <MessageCircle size={14} color={primaryColor} className="mr-1" />
             <Text className="text-primary font-bold text-xs">Chat</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, friends, friendRequests, requestedIds, primaryColor]);

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={[...combinedList, ...searchResults]}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {friendRequests.length > 0 && (
                <View className="py-2">
                  <View className="flex-row items-center px-6 py-3">
                    <Users size={18} color={primaryColor} />
                    <Text className="ml-2 text-sm font-bold text-onSurface-variant uppercase tracking-widest">
                      New Friend Requests ({friendRequests.length})
                    </Text>
                  </View>
                  {friendRequests.map(req => <RequestItem key={req.id} item={req} />)}
                </View>
              )}
              {combinedList.length > 0 && (
                <View className="px-6 py-2">
                  <Text className="text-sm font-bold text-onSurface-variant uppercase tracking-widest">
                    Your Contacts & Friends
                  </Text>
                </View>
              )}
              {searching ? (
                <View className="p-10 items-center">
                   <ActivityIndicator color={primaryColor} />
                   <Text className="text-onSurface-variant mt-2">Searching Global Users...</Text>
                </View>
              ) : searchResults.length > 0 && (
                <View className="px-6 py-4">
                  <Text className="text-sm font-bold text-onSurface-variant uppercase tracking-widest">
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
              <Text className="text-onSurface-variant text-center">No registered contacts found. Invite your friends!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ContactsScreen;
