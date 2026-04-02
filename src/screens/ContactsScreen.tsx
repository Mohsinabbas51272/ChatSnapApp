import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform, TextInput, ScrollView } from 'react-native';
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
  FriendRequest
} from '../services/social';
import { fetchUsersByIds } from '../services/contacts';
import { useNavigation } from '@react-navigation/native';
import { UserPlus, UserCheck, Clock, Check, X, Users, MessageCircle, Plus, Users as UsersIcon } from 'lucide-react-native';
import { getMutualFriends, createGroup, subscribeToGroups, Group } from '../services/groups';

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
  const [blockedByMe, setBlockedByMe] = useState<string[]>([]);
  const [blockedByOther, setBlockedByOther] = useState<string[]>([]);
  const [mutualFriends, setMutualFriends] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const auth = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation<any>();

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

    return () => {
      unsubRequests();
      unsubFriends();
      unsubSent();
      unsubBlockedMe();
      unsubWhoBlocked();
      unsubGroups();
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
    const mutualCount = mutualFriends[item.uid] || 0;
    
    return (
      <TouchableOpacity 
        className="flex-row items-center px-4 py-4 rounded-xl mx-2 mb-1"
        onPress={() => {
          if (showCreateGroup) {
            if (isFriend) toggleMemberSelection(item.uid);
          } else {
            isFriend ? navigation.navigate('Chat', { user: item }) : handleSendRequest(item)
          }
        }}
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
            {showCreateGroup && isFriend && (
              <View className={`ml-2 w-5 h-5 rounded-full items-center justify-center border ${selectedGroupMembers.includes(item.uid) ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                 {selectedGroupMembers.includes(item.uid) && <Check size={12} color="white" />}
              </View>
            )}
          </View>
          <Text className="text-onSurface-variant text-sm">
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
        {wasRequested && (
          <View className="w-10 h-10 items-center justify-center">
            <Clock size={20} color="#94a3b8" />
          </View>
        )}
        {isFriend && !showCreateGroup && (
          <View className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center">
             <MessageCircle size={14} color={primaryColor} className="mr-1" />
             <Text className="text-primary font-bold text-xs">Chat</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, friends, friendRequests, requestedIds, primaryColor, mutualFriends, showCreateGroup, selectedGroupMembers]);

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
              {!showCreateGroup ? (
                <View className="px-4 py-4 flex-row justify-between items-center">
                   <TouchableOpacity 
                    onPress={() => setShowCreateGroup(true)}
                    className="flex-1 bg-primary/10 p-4 rounded-3xl flex-row items-center justify-center border border-primary/20"
                   >
                      <UsersIcon size={20} color={primaryColor} />
                      <Text className="ml-2 text-primary font-black text-sm uppercase tracking-widest">New Group Chat</Text>
                   </TouchableOpacity>
                </View>
              ) : (
                <View className="px-6 py-6 border-b border-outline-variant/10 bg-surface-container-low mx-4 mt-2 rounded-[32px]">
                   <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-onSurface font-black text-lg">Create Squad</Text>
                      <TouchableOpacity onPress={() => { setShowCreateGroup(false); setSelectedGroupMembers([]); setGroupName(''); }}>
                         <X size={20} color="#737580" />
                      </TouchableOpacity>
                   </View>
                   <TextInput 
                      className="bg-surface-container-highest px-6 py-4 rounded-2xl text-onSurface font-bold border border-outline-variant/10 mb-4"
                      placeholder="Squad Name..."
                      placeholderTextColor="#737580"
                      value={groupName}
                      onChangeText={setGroupName}
                   />
                   <View className="flex-row justify-between items-center">
                      <Text className="text-onSurface-variant text-xs font-bold">{selectedGroupMembers.length} friends selected</Text>
                      <TouchableOpacity 
                        onPress={handleCreateGroup}
                        className="bg-primary px-6 py-3 rounded-full shadow-lg"
                      >
                         <Text className="text-white font-black text-xs uppercase">Create</Text>
                      </TouchableOpacity>
                   </View>
                </View>
              )}

              {groups.length > 0 && !showCreateGroup && (
                <View className="py-2">
                   <View className="flex-row items-center px-6 py-3">
                      <UsersIcon size={18} color={primaryColor} />
                      <Text className="ml-2 text-sm font-bold text-onSurface-variant uppercase tracking-widest">My Squads</Text>
                   </View>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
                      {groups.map(group => (
                        <TouchableOpacity 
                          key={group.id} 
                          onPress={() => navigation.navigate('Chat', { group })}
                          className="items-center mr-6"
                        >
                           <View className="w-16 h-16 bg-surface-container-highest rounded-3xl items-center justify-center border border-outline-variant/10 mb-2 shadow-sm">
                              <UsersIcon size={24} color={primaryColor} />
                           </View>
                           <Text className="text-onSurface font-bold text-xs" numberOfLines={1}>{group.name}</Text>
                        </TouchableOpacity>
                      ))}
                   </ScrollView>
                </View>
              )}
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
