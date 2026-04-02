import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const ChatScreen = ({ route, navigation }) => {
  const { chatId, otherUserName, otherUserId } = route?.params || {};
  const { user } = useAuth();

  // ✅ States properly initialized — no undefined crash
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);

  // ✅ Set header title once on mount only — NOT re-run on text change
  useEffect(() => {
    if (!chatId || !user) {
      Alert.alert('Error', 'Chat load nahi ho saka.');
      navigation.goBack();
      return;
    }
    navigation.setOptions({
      title: otherUserName || 'Chat',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty deps — runs once on mount, never on text type

  // ✅ Realtime messages listener — properly cleaned up
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          // ✅ Handle null timestamp (optimistic update se aata hai)
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }));
        setMessages(msgs);
        setLoading(false);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (err) => {
        console.error('Messages listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  // ✅ KEY FIX: useCallback stops text input from causing re-render crash
  const handleTextChange = useCallback((text) => {
    setInputText(text);
  }, []);

  // ✅ Send message — with proper error handling
  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending || !chatId || !user) return;

    setSending(true);
    setInputText(''); // Clear input immediately for better UX

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');

      await addDoc(messagesRef, {
        text: trimmed,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });

      // Update chat's last message
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: trimmed,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: user.uid,
      });
    } catch (err) {
      console.error('Send message error:', err);
      // ✅ Restore text if send fails
      setInputText(trimmed);
      Alert.alert('Error', 'Message send nahi ho saka. Dobara try karein.');
    } finally {
      setSending(false);
    }
  };

  // ✅ Extract uid outside callback — stable reference, no closure trap
  const currentUserId = user?.uid;

  // ✅ Render each message bubble — stable callback, no navigation dependency
  const renderMessage = useCallback(({ item }) => {
    const isMe = item.senderId === currentUserId;
    const time = item.createdAt instanceof Date
      ? item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {!isMe && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
          {time}
        </Text>
      </View>
    );
  }, [currentUserId]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          // ✅ Performance fixes
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={20}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Pehla message bhejein! 👋</Text>
            </View>
          }
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleTextChange}  // ✅ Stable callback — crash fix
            placeholder="Message likhein..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!sending}
            // ✅ These props prevent Android keyboard crash
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    marginBottom: 12,
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 16,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  senderName: {
    fontSize: 11,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#333',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  theirTime: {
    color: '#aaa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default ChatScreen;
