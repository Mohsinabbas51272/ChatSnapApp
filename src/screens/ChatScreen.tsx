import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Alert, Keyboard, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { onSnapshot, doc } from 'firebase/firestore';
import * as ScreenCapture from 'expo-screen-capture';
import Animated, { SlideInDown, FadeOut } from 'react-native-reanimated';
import { Text } from 'react-native';

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
  voteInPoll
} from '../services/messaging';
import { subscribeToGroupMessages, sendGroupMessage, deleteGroupMessage, voteInGroupPoll } from '../services/groups';
import { blockUser, unblockUser, subscribeToBlockedUsers, subscribeToWhoBlockedMe } from '../services/social';

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
  
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);

  // States
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [partnerStatus, setPartnerStatus] = useState<{ status: string; lastSeen?: any }>({ status: 'offline' });
  
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Allow or prevent screenshots
  ScreenCapture.usePreventScreenCapture(isSecret ? undefined : 'allow');

  // --- Effects ---
  useEffect(() => {
    if (isGroup || !chatPartner?.uid) return;
    const subscription = ScreenCapture.addScreenshotListener(() => {
      Alert.alert('Screenshot Detected', 'Screenshots are prohibited for privacy.');
      if (currentUser.uid && chatPartner?.uid) {
        sendMessage(currentUser.uid, chatPartner.uid, '📸 Took a screenshot of the chat!', 'text');
      }
    });

    return () => subscription.remove();
  }, [chatPartner?.uid, currentUser.uid, isGroup]);

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
    if (!currentUser.uid || (!chatPartner?.uid && !group?.id)) return;
    setMessages([]);

    if (isGroup) {
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
      return () => unsubscribeGroups();
    } else {
      const conversationId = [currentUser.uid, chatPartner.uid].sort().join('_');
      
      const unsubscribeMessages = subscribeToMessages(
        currentUser.uid, 
        chatPartner.uid, 
        (newMessages) => {
          setMessages(newMessages);
        }
      );

      const unsubscribeTyping = subscribeToTypingStatus(conversationId, (users) => {
        setTypingUsers(users.filter(id => id !== currentUser.uid));
      });

      return () => {
        unsubscribeMessages();
        unsubscribeTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [chatPartner?.uid, group?.id, currentUser.uid, isGroup]);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!currentUser.uid || isGroup || !chatPartner?.uid || messages.length === 0) return;
    // Mark received
    messages.filter(m => m.senderId === chatPartner.uid && !m.received && m.id).forEach(async (msg) => {
      if (msg.id) await markAsReceived(msg.id);
    });
    // Mark viewed
    messages.forEach(async (msg) => {
      if (!isGroup && msg.senderId === chatPartner?.uid && !msg.viewed && msg.id) {
        await markAsViewed(msg.id);
      }
    });
  }, [messages, chatPartner?.uid, group?.id, currentUser.uid, isGroup]);

  useEffect(() => {
    if (!chatPartner?.uid || isGroup) return;
    const unsub = onSnapshot(doc(db, 'users', chatPartner.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartnerStatus({ status: data.status, lastSeen: data.lastSeen });
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
    if (!statusObj.lastSeen) return 'Offline';
    const date = statusObj.lastSeen.toDate ? statusObj.lastSeen.toDate() : new Date(statusObj.lastSeen);
    const diff = new Date().getTime() - date.getTime();
    if (diff < 60000) return 'Abhi abhi'; // Just now in Urdu
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m pehle`; // m ago in Urdu
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [messages.length]);
  const handleTyping = useCallback((text: string) => {
    const uid = currentUser?.uid;
    const partnerId = chatPartner?.uid;
    if (!uid || !partnerId || isGroup) return;

    const conversationId = [uid, partnerId].sort().join('_');

    // Clear existing stop-typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Immediate start typing if not already started
    if (text.trim().length > 0) {
      setTypingStatus(conversationId, uid, true).catch(() => {});
      
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(conversationId, uid, false).catch(() => {});
        typingTimeoutRef.current = null;
      }, 3000); 
    }
  }, [currentUser?.uid, chatPartner?.uid, isGroup]);

  const handleSend = useCallback(async (
    type: 'text' | 'snap' | 'voice' | 'image' | 'document' | 'location' | 'poll' = 'text', 
    mediaUriOrText?: string, 
    duration?: number, 
    extras?: any
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
          type, 
          type === 'snap' ? duration : undefined, 
          type === 'voice' ? duration : undefined, 
          type === 'snap' ? filter : undefined,
          undefined, // storyReply
          type === 'location' ? extras : (type === 'poll' ? extras : undefined)
        );
      }
      
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

  const filteredMessages = useMemo(() => 
    chatSearchQuery.trim() 
      ? messages.filter(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
      : messages,
    [messages, chatSearchQuery]
  );

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
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} 
        style={{ flex: 1 }}
      >
        <View style={getResponsiveContainerStyle()} className="flex-1">
          
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item, index) => item.id || `msg-${index}`}
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
                   isGroup ? deleteGroupMessage(id) : deleteMessage(id); 
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
              />
            )}
            className="flex-1 px-4 pt-6"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (filteredMessages.length > prevMessageCountRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
              prevMessageCountRef.current = filteredMessages.length;
            }}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            legacyImplementation={false}
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
            className={`${isTablet ? 'rounded-t-3xl border-x border-t' : ''}`} 
            style={{ 
              backgroundColor: isDarkMode ? `${surfaceLow}CC` : surfaceLow,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'),
              paddingBottom: keyboardVisible ? (Platform.OS === 'ios' ? 8 : 4) : (insets.bottom || 8),
              paddingTop: 4
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
              />
            )}
          </View>
        </View>
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
