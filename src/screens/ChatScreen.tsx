import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Alert, Keyboard, StatusBar, ImageBackground, Modal, TouchableOpacity, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { onSnapshot, doc } from 'firebase/firestore';
import * as ScreenCapture from 'expo-screen-capture';
import Animated, { SlideInDown, FadeOut } from 'react-native-reanimated';
import { Text } from 'react-native';
import { X } from 'lucide-react-native';

import { db } from '../services/firebaseConfig';
import { RootState } from '../store';
import { RootStackScreenProps } from '../types/navigation';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';

import {
  sendMessage,
  subscribeToMessages,
  Message,
  markAsViewed,
  addReaction,
  deleteMessage,
  setTypingStatus,
  subscribeToTypingStatus,
  markAsReceived,
  toggleSecretChat,
  subscribeToSecretConversations,
  voteInPoll,
  deleteMessageForEveryone,
  deleteMessageForMe,
  forwardMessage
} from '../services/messaging';
import { subscribeToGroupMessages, sendGroupMessage, deleteGroupMessage, voteInGroupPoll, Group } from '../services/groups';
import { blockUser, unblockUser, subscribeToBlockedUsers, subscribeToWhoBlockedMe, subscribeToFriends } from '../services/social';
import { initiateCall } from '../services/calls';

import ChatHeader from '../components/chat/ChatHeader';
import MessageItem from '../components/chat/MessageItem';
import ChatInput from '../components/chat/ChatInput';
import SnapCameraScreen from '../components/SnapCameraScreen';
import SnapViewer from '../components/SnapViewer';
import SmartReplies from '../components/SmartReplies';
import ScreenBackground from '../components/ui/ScreenBackground';
import MediaViewerModal from '../components/chat/MediaViewerModal';

const ChatScreen = ({ route, navigation }: RootStackScreenProps<'Chat'>) => {
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const insets = useSafeAreaInsets();
  
  const { user: chatPartner, group } = route.params;
  const isGroup = !!group;
  
  const auth = useSelector((state: RootState) => state.auth);
  const currentUser = useMemo(() => ({
    uid: auth.uid,
    displayName: auth.displayName,
    photoURL: auth.photoURL
  }), [auth.uid, auth.displayName, auth.photoURL]);
  const currentUserId = auth.uid;
  const { primaryColor, isDarkMode, chatWallpaper, chatWallpaperOpacity } = useSelector((state: RootState) => state.theme);

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLimit, setMessageLimit] = useState(30);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeSnap, setActiveSnap] = useState<{ uri: string; duration: number; id: string; filter: string } | null>(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState<Message | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByPartner, setBlockedByPartner] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<{ status: string; lastSeen?: any; ghostMode?: boolean }>({ status: 'offline' });
  
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<{ messageId: string, text: string, senderName: string } | null>(null);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const lastScrollIdRef = useRef<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  // Allow or prevent screenshots
  ScreenCapture.usePreventScreenCapture();

  // --- Effects ---
  useEffect(() => {
    if (isGroup || !chatPartner?.uid || !currentUserId) return;
    const subscription = ScreenCapture.addScreenshotListener(() => {
      Alert.alert('Screenshot Detected', 'Screenshots are prohibited for privacy.');
      if (currentUserId && chatPartner?.uid) {
        sendMessage(currentUserId, chatPartner.uid, '📸 Took a screenshot of the chat!', 'Someone', 'text');
      }
    });

    return () => subscription.remove();
  }, [chatPartner?.uid, currentUserId, isGroup]);

  useEffect(() => {
    if (!currentUser.uid || !chatPartner?.uid || isGroup) return;

    const unsubBlockedMe = subscribeToBlockedUsers(currentUser.uid, (ids) => {
      setBlockedByMe(ids.includes(chatPartner.uid));
    });

    const unsubWhoBlocked = subscribeToWhoBlockedMe(currentUser.uid, (ids) => {
      setBlockedByPartner(ids.includes(chatPartner.uid));
    });

    return () => {
      unsubBlockedMe();
      unsubWhoBlocked();
    };
  }, [chatPartner?.uid, currentUser.uid, isGroup]);

  useEffect(() => {
    if (!currentUserId || (!chatPartner?.uid && !group?.id)) return;
    
    const newConvId = isGroup ? group.id : [currentUserId, chatPartner.uid].sort().join('_');
    
    // Only clear and re-subscribe if the conversation actually changed
    if (currentConversationIdRef.current !== newConvId) {
       currentConversationIdRef.current = newConvId;
       setMessages([]);
    }

    if (isGroup) {
      const typingId = group.id;
      const unsubscribeTyping = subscribeToTypingStatus(typingId, (users) => {
        setTypingUsers(users.filter(id => id !== currentUserId));
      });

      const unsubscribeGroups = subscribeToGroupMessages(group.id, (newMessages) => {
        const transformed: Message[] = newMessages.map(m => ({
          ...m,
          senderId: m.senderId,
          receiverId: '', 
          viewed: true, 
          received: true,
          displayName: m.senderName
        }));
        setMessages(transformed);
      });
      return () => {
        unsubscribeGroups();
        unsubscribeTyping();
      };
    } else {
      const conversationId = newConvId;
      
      const unsubscribeMessages = subscribeToMessages(
        currentUserId, 
        chatPartner.uid, 
        (newMessages) => {
          setMessages(newMessages);
        },
        messageLimit
      );

      const unsubscribeTyping = subscribeToTypingStatus(conversationId, (users) => {
        setTypingUsers(users.filter(id => id !== currentUserId));
      });

      return () => {
        unsubscribeMessages();
        unsubscribeTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [currentUserId, chatPartner?.uid, group?.id, isGroup, messageLimit]);

  // Reset processed IDs when switching chats
  useEffect(() => {
    processedIdsRef.current.clear();
    lastScrollIdRef.current = null;
  }, [chatPartner?.uid, group?.id]);

  const handleLoadMore = () => {
    setMessageLimit(prev => prev + 20);
  };

  // Load friends for forwarding
  useEffect(() => {
    if (!currentUser.uid) return;
    const unsub = subscribeToFriends(currentUser.uid, async (friendIds) => {
      if (friendIds.length > 0) {
        const { fetchUsersByIds } = await import('../services/contacts');
        const profiles = await fetchUsersByIds(friendIds);
        setFriends(profiles);
      }
    });
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardVisible(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Mark received and viewed status
  useEffect(() => {
    if (!currentUser.uid || isGroup || !chatPartner?.uid || messages.length === 0) return;
    
    messages.forEach(async (msg) => {
      if (!msg.id || processedIdsRef.current.has(msg.id)) return;

      const isPartnerMsg = msg.senderId === chatPartner?.uid;
      
      // Mark as received
      if (isPartnerMsg && !msg.received) {
        processedIdsRef.current.add(msg.id);
        await markAsReceived(msg.id);
      }
      
      // Mark as viewed
      if (isPartnerMsg && !msg.viewed) {
        processedIdsRef.current.add(msg.id);
        await markAsViewed(msg.id);
      }
    });
  }, [messages, chatPartner?.uid, currentUser.uid, isGroup]);

  useEffect(() => {
    if (!chatPartner?.uid || isGroup) return;
    const unsub = onSnapshot(doc(db, 'users', chatPartner.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartnerStatus({ status: data.status, lastSeen: data.lastSeen, ghostMode: data.ghostMode });
      }
    });
    return () => unsub();
  }, [chatPartner?.uid, isGroup]);

  useEffect(() => {
    navigation.setOptions({
      title: chatPartner?.displayName || group?.name || 'Chat',
    });
  }, [chatPartner?.displayName, group?.name, navigation]);

  useEffect(() => {
    if (!currentUser.uid || isGroup || !chatPartner?.uid) return;
    const unsub = subscribeToSecretConversations(currentUser.uid, (ids) => {
      setIsSecret(ids.includes(chatPartner?.uid));
    });
    return () => unsub();
  }, [currentUser.uid, chatPartner?.uid, isGroup]);

  // --- Helpers ---
  const formatLastSeen = useCallback((statusObj: any) => {
    if (statusObj.status === 'online') return 'Online';
    if (statusObj.ghostMode) return ''; // Hide last seen if Ghost Mode is on
    if (!statusObj.lastSeen) return 'Offline';
    const date = statusObj.lastSeen.toDate ? statusObj.lastSeen.toDate() : new Date(statusObj.lastSeen);
    const diff = new Date().getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.id !== lastScrollIdRef.current) {
      lastScrollIdRef.current = lastMsg.id || null;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [messages.length]);
  const handleTyping = useCallback((text: string) => {
    const uid = currentUser?.uid;
    if (!uid) return;

    const typingId = isGroup ? group.id : [uid, chatPartner?.uid].sort().join('_');
    if (!typingId) return;

    // Clear existing stop-typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Immediate start typing if not already started
    if (text.trim().length > 0) {
      setTypingStatus(typingId, uid, true).catch(() => {});
      
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(typingId, uid, false).catch(() => {});
        typingTimeoutRef.current = null;
      }, 3000); 
    }
  }, [currentUser?.uid, chatPartner?.uid, group?.id, isGroup]);

  const handleCall = async (type: 'voice' | 'video') => {
    if (!currentUser.uid || !chatPartner?.uid) return;
    
    const callId = await initiateCall(
      currentUser.uid, 
      currentUser.displayName || 'Someone', 
      chatPartner.uid, 
      chatPartner.displayName || 'Friend',
      type
    );
    
    if (callId) {
      navigation.navigate('Call', {
        callId,
        isIncoming: false,
        partnerName: chatPartner.displayName || 'Friend',
        partnerPhotoURL: chatPartner.photoURL || null,
        type
      });
    }
  };

  const handleSend = useCallback(async (
    type: 'text' | 'snap' | 'voice' | 'image' | 'document' | 'location' | 'poll' = 'text', 
    mediaUriOrText?: string, 
    duration?: number, 
    extras?: any,
    replyToData?: any
  ) => {
    const filter = extras?.filter || 'none';
    if (!currentUser.uid) { return Alert.alert("Masla Hua", "Dubara login karein."); }
    if (!isGroup && !chatPartner?.uid) { return Alert.alert("Masla Hua", "Recipient nahi mila."); }
    
    // Use the provided text or fallback (though we should always provide it now)
    const textToSend = (type === 'text' ? mediaUriOrText : mediaUriOrText) || '';
    if (type === 'text' && !textToSend.trim()) { return; }
    if (isSending) { return; }
    
    setIsSending(true);
    if (type === 'text') setInputText(''); 
    if (type === 'snap') setShowCamera(false);

    // Clear typing status immediately on send
    const uid = currentUser.uid;
    const typingId = isGroup ? group.id : [uid, chatPartner?.uid].sort().join('_');
    if (typingId && uid) {
      setTypingStatus(typingId, uid, false).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    try {
      if (isGroup) {
        await sendGroupMessage(
          group.id, 
          textToSend, 
          currentUser.displayName || 'Anonymous', 
          type,
          type === 'poll' ? extras : undefined
        );
      } else {
        await sendMessage(
          currentUser.uid, 
          chatPartner.uid, 
          textToSend, 
          currentUser.displayName || 'Someone',
          type, 
          type === 'voice' ? duration : undefined, 
          type === 'snap' ? filter : undefined,
          replyToData,
          undefined,
          type === 'location' ? extras : (type === 'poll' ? extras : undefined),
          type === 'snap' ? duration : undefined
        );
      }
      setReplyTo(null);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Nakam", "Paigham bhejne mein masla hua.");
      if (type === 'text') setInputText(textToSend); 
    } finally {
      setIsSending(false);
    }
  }, [currentUser.uid, chatPartner?.uid, group?.id, isGroup, isSending]); // Removed inputText dependency

  const filteredMessages = useMemo(() => {
    let base = messages.filter(m => !m.deletedBy?.includes(currentUser.uid!));
    if (chatSearchQuery.trim()) {
      base = base.filter(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));
    }
    return base;
  }, [messages, chatSearchQuery, currentUser.uid]);

  const textColor = isDarkMode ? '#FFFFFF' : getContrastText(primaryColor);
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)');
  const surfaceLow = isDarkMode ? '#000000' : primaryColor;
  const surfaceHigh = isDarkMode ? '#000000' : (isLightColor(primaryColor) ? '#E8EAF6' : 'rgba(255,255,255,0.1)');

  return (
    <ScreenBackground>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <ChatHeader 
        navigation={navigation}
        isGroup={isGroup}
        groupName={group?.name}
        memberCount={group?.memberIds?.length}
        partnerName={chatPartner?.displayName}
        partnerStatusText={formatLastSeen(partnerStatus)}
        partnerPhotoURL={chatPartner?.photoURL}
        isOnline={partnerStatus.status === 'online'}
        primaryColor={primaryColor}
        showInChatSearch={showInChatSearch}
        setShowInChatSearch={setShowInChatSearch}
        chatSearchQuery={chatSearchQuery}
        setChatSearchQuery={setChatSearchQuery}
        isSecret={isSecret}
        handleToggleSecret={() => toggleSecretChat(currentUser.uid!, chatPartner.uid, !isSecret)}
        handleClearChat={async () => {
          await Promise.all(messages.map(m => isGroup ? deleteGroupMessage(m.id!) : deleteMessage(m.id!)));
          Alert.alert("Success", "Chat cleared");
        }}
        blockedByMe={blockedByMe}
        handleBlockToggle={async () => blockedByMe ? await unblockUser(chatPartner.uid) : await blockUser(chatPartner.uid)}
        isDarkMode={isDarkMode}
        onCallVoice={() => handleCall('voice')}
        onCallVideo={() => handleCall('video')}
        onViewMedia={() => navigation.navigate('MediaGallery', {
          conversationId: [currentUser.uid, chatPartner.uid].sort().join('_'),
          partnerName: chatPartner.displayName || 'Friend'
        })}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
        style={{ flex: 1 }}
      >
        <ImageBackground 
          source={chatWallpaper ? { uri: chatWallpaper } : undefined}
          style={{ flex: 1 }}
          imageStyle={{ opacity: chatWallpaperOpacity }}
        >
          <View style={getResponsiveContainerStyle()} className="flex-1">
            
            <FlatList
              ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item, index) => item.id || `msg-${index}`}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            inverted={false}
            renderItem={({ item }) => (
              <MessageItem 
                item={item}
                isMe={item.senderId === currentUser.uid}
                chatPartner={chatPartner}
                onOpenSnap={(msg: Message) => {
                  if (!msg.viewed && msg.senderId !== currentUser.uid) {
                    setActiveSnap({ uri: msg.text, duration: msg.timer || 5, id: msg.id!, filter: msg.filter || 'none' });
                  }
                }}
                onPressMedia={(m: Message) => setSelectedMediaItem(m)}
                onLongPress={(id: string) => setReactionMessageId(id)}
                reactionMessageId={reactionMessageId}
                handleReaction={(msgId: string, emoji: string, react: any) => {
                  if (currentUser.uid) {
                    addReaction(msgId, emoji, currentUser.uid, react);
                    setReactionMessageId(null);
                  }
                }}
                handleDeleteMessage={(id: string) => { 
                   const msg = messages.find(m => m.id === id);
                   if (!msg) return;
                   
                   const isAuthor = msg.senderId === currentUser.uid;
                   
                   const options = [
                     { text: "Cancel", style: "cancel" as const },
                     { text: "Delete for Me", style: "destructive" as const, onPress: () => deleteMessageForMe(id, currentUser.uid!) },
                   ];
                   
                   if (isAuthor && !isGroup) {
                     options.push({ text: "Delete for Everyone", style: "destructive" as const, onPress: () => deleteMessageForEveryone(id) });
                   } else if (isAuthor && isGroup) {
                     options.push({ text: "Delete", style: "destructive" as const, onPress: () => deleteGroupMessage(id) });
                   }

                   Alert.alert("Delete Message", "Choose an option", options);
                   setReactionMessageId(null); 
                }}
                onForward={(id: string) => {
                   const msg = messages.find(m => m.id === id);
                   if (!msg) return;
                   setMessageToForward(msg);
                   setIsForwardModalVisible(true);
                   setReactionMessageId(null);
                }}
                primaryColor={primaryColor}
                isGroup={isGroup}
                isDarkMode={isDarkMode}
                onVote={(msgId, optIdx) => {
                  if (isGroup) {
                    voteInGroupPoll(msgId, optIdx, currentUser.uid!);
                  } else {
                    voteInPoll(msgId, optIdx, currentUser.uid!);
                  }
                }}
                searchQuery={chatSearchQuery}
                onReply={(msg) => {
                  setReplyTo({
                    messageId: msg.id,
                    text: msg.type === 'text' ? msg.text : `[${msg.type}]`,
                    senderName: msg.senderId === currentUser.uid ? 'You' : (chatPartner.displayName || 'Friend')
                  });
                }}
              />
            )}
            className="flex-1 px-4 pt-6"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (filteredMessages.length > prevMessageCountRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
              prevMessageCountRef.current = filteredMessages.length;
            }}
          />

          {!blockedByMe && !blockedByPartner && messages.length > 0 && messages[messages.length - 1].senderId !== currentUser.uid && !inputText.trim() && (
            <SmartReplies 
              lastMessage={messages[messages.length - 1].text}
              onSelect={(reply) => {
                handleSend('text', reply);
              }}
              primaryColor={primaryColor}
              isDarkMode={isDarkMode}
            />
          )}

          {typingUsers.length > 0 && (
            <Animated.View entering={SlideInDown.duration(300)} exiting={FadeOut.duration(200)} className="px-4 py-2">
              <View 
                className="flex-row items-center self-start px-4 py-2 rounded-2xl border"
                style={{ backgroundColor: `${surfaceHigh}80`, borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <View className="flex-row items-center space-x-1 mr-2">
                   <View className="w-1.5 h-1.5 bg-primary rounded-full" />
                   <View className="w-1.5 h-1.5 bg-primary rounded-full ml-1 opacity-70" />
                   <View className="w-1.5 h-1.5 bg-primary rounded-full ml-1 opacity-40" />
                </View>
                <Text className="text-primary text-xs font-bold uppercase tracking-widest">
                  {typingUsers.length === 1 ? `${chatPartner.displayName} is typing...` : 'Someone is typing...'}
                </Text>
              </View>
            </Animated.View>
          )}

          <View 
            style={{ 
              backgroundColor: 'transparent',
              paddingBottom: Platform.OS === 'ios' ? (keyboardVisible ? 2 : (insets.bottom || 8)) : (insets.bottom || 8),
              paddingTop: 8,
              position: 'relative'
            }}
          >
            {blockedByMe || blockedByPartner ? (
              <View className="h-20 items-center justify-center px-10">
                <View className="px-6 py-3 rounded-2xl border" style={{ backgroundColor: surfaceHigh, borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <Text className="text-secondary font-bold text-center">
                    {blockedByMe ? 'You have blocked this user' : 'This conversation is restricted'}
                  </Text>
                </View>
              </View>
            ) : (
              <ChatInput 
                primaryColor={primaryColor}
                isDarkMode={isDarkMode}
                onSend={handleSend as any}
                onOpenCamera={() => setShowCamera(true)}
                onTyping={handleTyping}
                inputText={inputText}
                setInputText={setInputText}
                isSending={isSending}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            )}
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>

      <SnapCameraScreen isVisible={showCamera} onClose={() => setShowCamera(false)} onSend={(uri: string, timer: number, filter: string) => handleSend('snap', uri, timer, filter)} />

      {activeSnap && (
        <SnapViewer 
          isVisible={!!activeSnap}
          imageUri={activeSnap.uri}
          duration={activeSnap.duration}
          filter={activeSnap.filter}
          onFinish={() => {
             if (activeSnap.id) markAsViewed(activeSnap.id);
             setActiveSnap(null);
          }}
          onInterrupted={() => setActiveSnap(null)}
        />
      )}

      {/* FORWARD MESSAGE MODAL */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={isForwardModalVisible} 
        onRequestClose={() => setIsForwardModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[40px] p-6 h-[70%]" style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black" style={{ color: textColor }}>Forward to...</Text>
              <TouchableOpacity onPress={() => setIsForwardModalVisible(false)} className="p-2">
                <X size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={async () => {
                    if (messageToForward && currentUser.uid) {
                      const success = await forwardMessage(
                        messageToForward, 
                        item.uid, 
                        currentUser.uid, 
                        currentUser.displayName || 'Friend'
                      );
                      if (success) {
                        setIsForwardModalVisible(false);
                        Alert.alert("Success", "Message forwarded!");
                      }
                    }
                  }}
                  className="flex-row items-center p-3 mb-2 rounded-2xl"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                >
                  <View className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    {item.photoURL ? (
                      <RNImage source={{ uri: item.photoURL }} className="w-full h-full" />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Text className="font-bold text-lg">{item.displayName?.charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="ml-4 font-bold text-lg" style={{ color: textColor }}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center mt-20">
                  <Text style={{ color: subTextColor }}>No friends found to forward to.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <MediaViewerModal 
        isVisible={!!selectedMediaItem} 
        item={selectedMediaItem} 
        onClose={() => setSelectedMediaItem(null)} 
        primaryColor={primaryColor} 
      />
    </ScreenBackground>
  );
};

export default ChatScreen;
