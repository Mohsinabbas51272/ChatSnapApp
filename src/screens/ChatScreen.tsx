import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  subscribeToSecretConversations
} from '../services/messaging';
import { subscribeToGroupMessages, sendGroupMessage } from '../services/groups';
import { blockUser, unblockUser, subscribeToBlockedUsers, subscribeToWhoBlockedMe } from '../services/social';

import ChatHeader from '../components/chat/ChatHeader';
import MessageItem from '../components/chat/MessageItem';
import ChatInput from '../components/chat/ChatInput';
import SnapCameraScreen from '../components/SnapCameraScreen';
import SnapViewer from '../components/SnapViewer';
import SmartReplies from '../components/SmartReplies';
import ScreenBackground from '../components/ui/ScreenBackground';

const ChatScreen = ({ route, navigation }: RootStackScreenProps<'Chat'>) => {
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  
  const { user: chatPartner, group } = route.params;
  const isGroup = !!group;
  
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeSnap, setActiveSnap] = useState<{ uri: string; duration: number; id: string; filter: string } | null>(null);
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
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
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
      if (!isGroup && msg.senderId === chatPartner?.uid && !msg.viewed && msg.id && (msg.type === 'text' || msg.type === 'voice')) {
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
    if (!currentUser.uid || isGroup || !chatPartner?.uid) return;
    const unsub = subscribeToSecretConversations(currentUser.uid, (ids) => {
      setIsSecret(ids.includes(chatPartner?.uid));
    });
    return () => unsub();
  }, [currentUser.uid, chatPartner?.uid, isGroup]);

  // --- Helpers ---
  const formatLastSeen = (statusObj: any) => {
    if (statusObj.status === 'online') return 'Online';
    if (!statusObj.lastSeen) return 'Offline';
    const date = statusObj.lastSeen.toDate ? statusObj.lastSeen.toDate() : new Date(statusObj.lastSeen);
    const diff = new Date().getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // --- Handlers ---
  const handleTyping = (text: string) => {
    if (!currentUser?.uid || !chatPartner?.uid || isGroup) return;
    const conversationId = [currentUser.uid, chatPartner.uid].sort().join('_');
    
    if (text.trim() && typingTimeoutRef.current === null) {
      setTypingStatus(conversationId, currentUser.uid, true).catch(() => {});
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      if (currentUser?.uid) {
        setTypingStatus(conversationId, currentUser.uid, false).catch(() => {});
      }
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSend = async (type: 'text' | 'snap' | 'voice' = 'text', mediaUriOrText?: string, duration?: number, filter: string = 'none') => {
    console.log('[DEBUG] handleSend started. Type:', type, 'mediaUriOrText:', mediaUriOrText);
    if (!currentUser.uid) { console.log('[DEBUG] Auth Error'); return Alert.alert("Auth Error", "Please login again."); }
    if (!isGroup && !chatPartner?.uid) { console.log('[DEBUG] Recipient missing'); return Alert.alert("Error", "Recipient missing."); }
    
    // Use the explicit passed text or standard state text fallback
    const resolvedText = type === 'text' ? (mediaUriOrText || inputText) : inputText;
    
    if (type === 'text' && !resolvedText.trim()) { console.log('[DEBUG] Empty text, returning'); return; }

    if (isSending) { console.log('[DEBUG] Blocked by isSending lock'); return; }
    console.log('[DEBUG] Setting isSending to true');
    setIsSending(true);

    const textToSend = type === 'text' ? resolvedText : (mediaUriOrText || '');
    if (type === 'text') setInputText(''); // Clear input instantly for smooth UI
    if (type === 'snap') setShowCamera(false);

    try {
      console.log('[DEBUG] Attempting to execute sendMessage, textToSend:', textToSend);
      if (isGroup) {
        await sendGroupMessage(group.id, textToSend, currentUser.displayName || 'Anonymous', type);
      } else {
        await sendMessage(currentUser.uid, chatPartner.uid, textToSend, type, type === 'snap' ? duration : undefined, type === 'voice' ? duration : undefined, type === 'snap' ? filter : undefined);
      }
      console.log('[DEBUG] sendMessage completed successfully');
      
      // Scroll to bottom manually if needed, usually snap updates list
      setTimeout(() => {
        try {
           console.log('[DEBUG] Attempting to scroll to end');
           flatListRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
           console.log('[DEBUG] scrollToEnd failed silently', e);
        }
      }, 100);
    } catch (error) {
      console.error('[DEBUG] Messaging Error Caught in ChatScreen:', error);
      Alert.alert("Failed", "Message failed to send.");
      if (type === 'text') setInputText(textToSend); // Restore if error
    } finally {
      console.log('[DEBUG] Releasing isSending lock');
      setIsSending(false);
    }
  };

  const filteredMessages = useMemo(() => 
    chatSearchQuery.trim() 
      ? messages.filter(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
      : messages,
    [messages, chatSearchQuery]
  );

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
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
          await Promise.all(messages.map(m => deleteMessage(m.id!)));
          Alert.alert("Success", "Chat cleared");
        }}
        blockedByMe={blockedByMe}
        handleBlockToggle={async () => blockedByMe ? await unblockUser(chatPartner.uid) : await blockUser(chatPartner.uid)}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25} style={{ flex: 1 }}>
        <View className="flex-1" style={isTablet ? { alignSelf: 'center', width: '100%', maxWidth: 768 } : undefined}>
          
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item, index) => item.id || `msg-${index}`}
            renderItem={({ item }) => (
              <MessageItem 
                item={item}
                isMe={item.senderId === currentUser.uid}
                chatPartner={chatPartner}
                onOpenSnap={(msg) => {
                  if (!msg.viewed && msg.senderId !== currentUser.uid) {
                    setActiveSnap({ uri: msg.text, duration: msg.timer || 5, id: msg.id!, filter: msg.filter || 'none' });
                  }
                }}
                onLongPress={(id) => setReactionMessageId(id)}
                reactionMessageId={reactionMessageId}
                handleReaction={(msgId, emoji, react) => {
                  if (currentUser.uid) {
                    addReaction(msgId, emoji, currentUser.uid, react);
                    setReactionMessageId(null);
                  }
                }}
                handleDeleteMessage={(id) => { deleteMessage(id); setReactionMessageId(null); }}
                primaryColor={primaryColor}
                isGroup={isGroup}
              />
            )}
            className="flex-1 px-4 pt-6"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (filteredMessages.length > prevMessageCountRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
              prevMessageCountRef.current = filteredMessages.length;
            }}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />

          {!blockedByMe && !blockedByPartner && messages.length > 0 && messages[messages.length - 1].senderId !== currentUser.uid && !inputText.trim() && (
            <SmartReplies 
              lastMessage={messages[messages.length - 1].text}
              onSelect={(reply) => setInputText(reply)}
              primaryColor={primaryColor}
            />
          )}

          {typingUsers.length > 0 && (
            <Animated.View entering={SlideInDown.duration(300)} exiting={FadeOut.duration(200)} className="px-4 py-2">
              <View className="flex-row items-center bg-surface-container-high/50 self-start px-4 py-2 rounded-2xl border border-outline-variant/10">
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

          <View className={`bg-surface-container-low/60 ${isTablet ? 'rounded-t-3xl border-x border-t border-outline-variant/10' : ''}`} style={{ paddingBottom: keyboardVisible ? 20 : insets.bottom + 5 }}>
            {blockedByMe || blockedByPartner ? (
              <View className="h-20 items-center justify-center px-10">
                <View className="bg-surface-container-highest px-6 py-3 rounded-2xl border border-outline-variant/10">
                  <Text className="text-secondary font-bold text-center">
                    {blockedByMe ? 'You have blocked this user' : 'This conversation is restricted'}
                  </Text>
                </View>
              </View>
            ) : (
              <ChatInput 
                primaryColor={primaryColor}
                inputText={inputText}
                setInputText={setInputText}
                onTyping={handleTyping}
                onSend={handleSend as any}
                onOpenCamera={() => setShowCamera(true)}
                isSending={isSending}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <SnapCameraScreen isVisible={showCamera} onClose={() => setShowCamera(false)} onSend={(uri, timer, filter) => handleSend('snap', uri, timer, filter)} />

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
    </ScreenBackground>
  );
};

export default ChatScreen;
