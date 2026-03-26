import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Dimensions,
  StatusBar,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Camera, Image as ImageIcon, ArrowLeft, MoreVertical, Smile, Check, CheckCheck, Mic, Play, Pause, Activity, Shield, Trash, ChevronLeft, Search } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { sendMessage, subscribeToMessages, Message, markAsViewed, addReaction, deleteMessage } from '../services/messaging';
import { useRoute, useNavigation } from '@react-navigation/native';

import SnapCameraScreen from '../components/SnapCameraScreen';
import SnapViewer from '../components/SnapViewer';
import SmartReplies from '../components/SmartReplies';
import { toggleSecretChat, subscribeToSecretConversations } from '../services/messaging';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';

const { width } = Dimensions.get('window');

const VoiceMessagePlayer = React.memo(({ uri, duration, isMe, primaryColor }: { uri: string; duration?: number; isMe: boolean; primaryColor: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playSound = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
        if (status.positionMillis) setPosition(status.positionMillis);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-row items-center py-1">
      <TouchableOpacity 
        onPress={playSound}
        className={`w-10 h-10 rounded-full items-center justify-center ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}
      >
        {isPlaying ? (
          <Pause size={18} color={isMe ? 'white' : '#9ba8ff'} fill={isMe ? 'white' : '#9ba8ff'} />
        ) : (
          <Play size={18} color={isMe ? 'white' : '#9ba8ff'} fill={isMe ? 'white' : '#9ba8ff'} />
        )}
      </TouchableOpacity>
      <View className="ml-3 flex-1">
        <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
           <View 
             className="h-full" 
             style={{ 
               width: `${(position / (duration ? duration * 1000 : 1)) * 100}%`,
               backgroundColor: isMe ? 'white' : '#9ba8ff'
             }} 
           />
        </View>
        <Text className={`text-[10px] mt-1 font-bold ${isMe ? 'text-white/80' : 'text-onSurface-variant'}`}>
          {duration ? formatTime(duration) : 'Voice Note'}
        </Text>
      </View>
    </View>
  );
});

// Memoize items for performance
const MessageItem = React.memo(({ item, isMe, chatPartner, onOpenSnap, onLongPress, reactionMessageId, handleReaction, handleDeleteMessage, primaryColor }: any) => {
  const isSnap = item.type === 'snap';
  const isVoice = item.type === 'voice';
  const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;

  return (
    <View className={`mb-6 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="w-9 h-9 rounded-full bg-surface-container-highest mr-2 items-center justify-center overflow-hidden border border-outline-variant/20">
           {chatPartner.photoURL ? (
              <Image source={{ uri: chatPartner.photoURL }} className="w-full h-full" />
           ) : (
               <Text className="text-xs font-bold text-onSurface">{(chatPartner.displayName || chatPartner.phoneNumber || '?').charAt(0).toUpperCase()}</Text>
           )}
        </View>
      )}
      <View style={{ maxWidth: width * 0.75 }}>
        <TouchableOpacity 
          disabled={(!isSnap || item.viewed || isMe) && !isMe && !isVoice} 
          onPress={() => isMe ? null : (isSnap ? onOpenSnap(item) : null)}
          onLongPress={() => onLongPress(item.id!)}
          delayLongPress={300}
          style={isMe ? {
            backgroundColor: '#4963ff',
            shadowColor: '#4963ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          } : {
            backgroundColor: '#222532',
          }}
          className={`px-5 py-3 rounded-2xl ${
            isMe ? 'rounded-tr-none' : 'rounded-tl-none'
          } ${isSnap && item.viewed ? 'opacity-40' : ''}`}
        >
          {isSnap ? (
            <View className="flex-row items-center">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}>
                <Camera size={18} color={isMe ? 'white' : '#9ba8ff'} />
              </View>
              <Text className={`ml-3 font-bold text-base ${isMe ? 'text-white' : 'text-primary'}`}>
                {item.viewed ? 'Opened' : isMe ? 'Sent Snap' : 'Tap to View'}
              </Text>
            </View>
          ) : isVoice ? (
             <VoiceMessagePlayer 
               uri={item.text} 
               duration={item.duration} 
               isMe={isMe} 
               primaryColor={primaryColor} 
             />
          ) : (
            <View>
                <Text className={`text-base font-medium pr-6 ${isMe ? 'text-white' : 'text-onSurface'}`}>
                {item.text}
                </Text>
                {isMe && (
                  <View className="absolute bottom-[-2] right-[-4]">
                      {item.viewed ? (
                        <CheckCheck size={14} color="#9ba8ff" />
                      ) : item.received ? (
                        <CheckCheck size={14} color="rgba(255,255,255,0.5)" />
                      ) : (
                        <Check size={14} color="rgba(255,255,255,0.5)" />
                      )}
                  </View>
                )}
            </View>
          )}
          
          {reactionMessageId === item.id && (
            <View className="absolute -top-14 left-0 right-0 flex-row bg-surface-container-highest rounded-full px-3 py-2 shadow-2xl border border-outline-variant/15 z-50 justify-between items-center min-w-[240]">
              <View className="flex-row flex-1 justify-around mr-2">
                {['❤️', '😂', '🔥', '👍', '😮', '😢'].map((emoji) => (
                  <TouchableOpacity 
                    key={emoji} 
                    onPress={() => handleReaction(item.id!, emoji, item.reactions)}
                    className="p-1"
                  >
                    <Text className="text-xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isMe && (
                 <TouchableOpacity 
                  onPress={() => handleDeleteMessage(item.id!)}
                  className="p-2 bg-error-container rounded-full ml-1"
                >
                  <Trash size={18} color="#ff4d4d" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>

        {hasReactions && (
          <View className={`flex-row flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(item.reactions!).map(([emoji, uids]: [string, any]) => (
              <View key={emoji} className="bg-surface-container-highest rounded-full px-1.5 py-0.5 shadow-sm border border-outline-variant/15 mr-1 mb-1 flex-row items-center">
                <Text className="text-xs">{emoji}</Text>
                {uids.length > 1 && <Text className="text-[10px] ml-0.5 text-onSurface-variant font-bold">{uids.length}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const ChatScreen = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [activeSnap, setActiveSnap] = useState<{ uri: string; duration: number; id: string; filter: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { user: chatPartner } = useRoute<any>().params;
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const navigation = useNavigation();

  useEffect(() => {
    if (!currentUser.uid || !chatPartner.uid) return;

    const unsubscribe = subscribeToMessages(currentUser.uid, chatPartner.uid, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [chatPartner.uid, currentUser.uid]);

  useEffect(() => {
    if (!currentUser.uid || !chatPartner.uid || messages.length === 0) return;

    // Only mark the latest message as viewed if it's from partner and unread
    // This reduces the number of update calls significantly
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderId === chatPartner.uid && !lastMessage.viewed) {
      markAsViewed(lastMessage.id!);
    }
  }, [messages.length, chatPartner.uid, currentUser.uid]);

  const [partnerStatus, setPartnerStatus] = useState<{ status: string; lastSeen?: any }>({ status: 'offline' });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!chatPartner.phoneNumber) return;

    const partnerDocId = `user-${chatPartner.phoneNumber}`;
    const unsubscribe = onSnapshot(doc(db, 'users', partnerDocId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPartnerStatus({ status: data.status, lastSeen: data.lastSeen });
      }
    });

    return () => unsubscribe();
  }, [chatPartner.phoneNumber]);

  const [isSecret, setIsSecret] = useState(false);

  useEffect(() => {
    if (!currentUser.uid) return;
    const unsubscribe = subscribeToSecretConversations(currentUser.uid, (partnerIds) => {
      setIsSecret(partnerIds.includes(chatPartner.uid));
    });
    return () => unsubscribe();
  }, [currentUser.uid, chatPartner.uid]);

  const handleToggleSecret = () => {
    if (currentUser.uid) {
      toggleSecretChat(currentUser.uid, chatPartner.uid, !isSecret);
    }
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'Offline';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
        recordingIntervalRef.current = setInterval(() => {
           setRecordingDuration((curr: number) => curr + 1);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    const currentDuration = recordingDuration;
    setRecordingDuration(0);
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      handleSend('voice', uri, currentDuration);
    }
  };

  const handleSend = async (type: 'text' | 'snap' | 'voice' = 'text', mediaUri?: string, duration?: number, filter: string = 'none') => {
    if ((type === 'text' && !inputText.trim()) || !currentUser.uid) return;

    const textToSend = type === 'text' ? inputText : (mediaUri || '');
    if (type === 'text') setInputText('');
    if (type === 'snap') setShowCamera(false);

    try {
      await sendMessage({
        senderId: currentUser.uid,
        receiverId: chatPartner.uid,
        text: textToSend,
        type: type,
        timer: type === 'snap' ? duration : undefined,
        duration: type === 'voice' ? duration : undefined,
        filter: type === 'snap' ? filter : undefined,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenSnap = React.useCallback((msg: Message) => {
    if (msg.type === 'snap' && !msg.viewed && msg.senderId !== currentUser.uid) {
      setActiveSnap({ uri: msg.text, duration: msg.timer || 5, id: msg.id!, filter: msg.filter || 'none' });
    }
  }, [currentUser.uid]);

  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  
  const handleLongPress = React.useCallback((id: string) => {
    setReactionMessageId(id);
  }, []);

  const handleReaction = React.useCallback((msgId: string, emoji: string, currentReactions: any) => {
    if (currentUser.uid) {
      addReaction(msgId, emoji, currentUser.uid, currentReactions);
      setReactionMessageId(null);
    }
  }, [currentUser.uid]);

  const handleDeleteMessage = React.useCallback((msgId: string) => {
    deleteMessage(msgId);
    setReactionMessageId(null);
  }, []);

  const handleClearChat = async () => {
    if (messages.length === 0) return;
    try {
      await Promise.all(messages.map(m => deleteMessage(m.id!)));
      Alert.alert("Success", "Chat cleared");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to clear chat");
    }
  };



  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const filteredMessages = useMemo(() => 
    chatSearchQuery.trim() 
      ? messages.filter(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
      : messages,
    [messages, chatSearchQuery]
  );

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {showInChatSearch ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: primaryColor }}>
          <View className="flex-row items-center px-4 py-3">
             <TouchableOpacity className="p-2 mr-2" onPress={() => { setShowInChatSearch(false); setChatSearchQuery(''); }}>
                <ChevronLeft size={24} color="white" />
             </TouchableOpacity>
             <View className="flex-1 bg-white/20 rounded-full flex-row items-center px-4 h-11">
                <Search size={18} color="white" />
                <TextInput 
                  className="flex-1 ml-2 text-white font-bold h-full"
                  placeholder="Find in chat..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={chatSearchQuery}
                  onChangeText={setChatSearchQuery}
                  autoFocus
                />
             </View>
          </View>
        </SafeAreaView>
      ) : (
        <Header 
          title={chatPartner.displayName} 
          showBack 
          rightElement={
            <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={() => setShowInChatSearch(true)}
                className="p-2.5 rounded-full mr-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Search size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleToggleSecret} 
                className="p-2.5 rounded-full mr-1"
                style={{ backgroundColor: isSecret ? 'rgba(255,255,255,0.3)' : 'transparent' }}
              >
                <Shield size={20} color="white" fill={isSecret ? 'white' : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity 
                 onPress={() => {
                   Alert.alert("Clear Chat", "Are you sure you want to delete all messages?", [
                     { text: "Cancel", style: "cancel" },
                     { text: "Clear", style: "destructive", onPress: handleClearChat }
                   ]);
                 }} 
                 className="p-2.5 rounded-full mr-1"
              >
                <Trash size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="p-2.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <MoreVertical size={20} color="white" />
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        renderItem={({ item }) => (
          <MessageItem 
            item={item}
            isMe={item.senderId === currentUser.uid}
            chatPartner={chatPartner}
            onOpenSnap={handleOpenSnap}
            onLongPress={handleLongPress}
            reactionMessageId={reactionMessageId}
            handleReaction={handleReaction}
            handleDeleteMessage={handleDeleteMessage}
            primaryColor={primaryColor}
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
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {messages.length > 0 && messages[messages.length - 1].senderId !== currentUser.uid && !inputText.trim() && (
        <SmartReplies 
          lastMessage={messages[messages.length - 1].text}
          onSelect={(reply) => setInputText(reply)}
          primaryColor={primaryColor}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View className="flex-row items-end px-4 py-4 bg-surface-container-low/60">
          {!isRecording ? (
            <TouchableOpacity onPress={() => setShowCamera(true)} className="p-3 bg-surface-container-highest rounded-full mb-1">
              <Camera size={22} color="#737580" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <View className="p-3 mb-1">
               <Activity size={22} color="#9ba8ff" />
            </View>
          )}
          
          <View className="flex-1 bg-surface-container-high rounded-full mx-3 px-4 py-3 flex-row items-center border border-outline-variant/5">
            {!isRecording ? (
               <>
                <TextInput
                  className="flex-1 text-onSurface text-base font-medium max-h-32 p-0"
                  placeholder="Type a message..."
                  placeholderTextColor="#464752"
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                />
                <TouchableOpacity className="ml-2">
                   <Smile size={20} color="#464752" />
                </TouchableOpacity>
              </>
            ) : (
              <View className="flex-1 flex-row items-center justify-between">
                 <Text className="text-onSurface font-black tracking-widest uppercase text-xs">Recording...</Text>
                 <Text className="text-primary font-bold">{recordingDuration}s</Text>
              </View>
            )}
          </View>

          {inputText.trim() ? (
            <TouchableOpacity 
              onPress={() => handleSend('text')}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: '#4963ff',
                shadowColor: '#9ba8ff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Send size={20} color="white" fill="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
               onPressIn={startRecording}
               onPressOut={stopRecording}
               className="w-12 h-12 rounded-full items-center justify-center"
               style={{ 
                 backgroundColor: isRecording ? '#d73357' : '#4963ff',
                 shadowColor: '#9ba8ff',
                 shadowOffset: { width: 0, height: 0 },
                 shadowOpacity: 0.3,
                 shadowRadius: 10,
                 elevation: 6,
               }}
            >
               <Mic size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <SnapCameraScreen 
        isVisible={showCamera} 
        onClose={() => setShowCamera(false)}
        onSend={(uri: string, timer: number, filter: string) => handleSend('snap', uri, timer, filter)}
      />

      {activeSnap && (
        <SnapViewer 
          isVisible={!!activeSnap}
          imageUri={activeSnap.uri}
          duration={activeSnap.duration}
          filter={activeSnap.filter}
          onFinish={() => {
             markAsViewed(activeSnap.id);
             setActiveSnap(null);
          }}
          onInterrupted={() => setActiveSnap(null)}
        />
      )}
    </ScreenBackground>
  );
};

export default ChatScreen;
