import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, Keyboard, FlatList, Alert, StyleSheet } from 'react-native';
import { Send, Camera, Smile, Mic, Activity } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { isLightColor, getContrastText } from '../../services/colors';

const EMOJIS = [
  '❤️', '😂', '🔥', '👍', '😮', '😢', '😍', '👏', '🙌', '🎉', '✨', '🤔', '😊', '😭', '🙏', '😎',
  '💖', '🤣', '💯', '👊', '🤯', '😡', '🥰', '🤝', '💪', '🎈', '🌟', '🙄', '😌', '😩', '🥺', '😏',
  '🖤', '😅', '💥', '👌', '😴', '🤨', '😘', '✅', '🔥', '🎊', '🌈', '🧐', '😋', '💔', '😇', '👀'
];

interface ChatInputProps {
  primaryColor: string;
  isDarkMode: boolean;
  onSend: (type: 'text' | 'voice' | 'snap', mediaUriOrText?: string, duration?: number) => Promise<void>;
  onOpenCamera: () => void;
  onTyping: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  isSending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  primaryColor,
  isDarkMode,
  onSend,
  onOpenCamera,
  onTyping,
  inputText,
  setInputText,
  isSending,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localText, setLocalText] = useState(inputText);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (inputText === '') setLocalText('');
  }, [inputText]);
  
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        recordingRef.current = newRecording;
        setIsRecording(true);
        setRecordingDuration(0);
        
        recordingIntervalRef.current = setInterval(() => {
           setRecordingDuration((curr: number) => curr + 1);
        }, 1000);
      } else {
        Alert.alert("Permission Required", "Microphone access is needed for voice notes.");
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    const currentRec = recordingRef.current;
    if (!currentRec) {
        setIsRecording(false);
        return;
    }

    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    const finalDuration = recordingDuration;
    recordingRef.current = null;
    setRecordingDuration(0);
    
    try {
      await currentRec.stopAndUnloadAsync();
      const uri = currentRec.getURI();
      if (uri && finalDuration >= 1) {
        await onSend('voice', uri, finalDuration);
      }
    } catch (error) {
      console.error('Failed to stop/send recording', error);
    }
  };

  const syncToParent = useCallback((text: string) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (text.length === 1) {
       setInputText(text);
       onTyping(text);
    } else {
      syncTimerRef.current = setTimeout(() => {
        setInputText(text);
        onTyping(text);
      }, 300);
    }
  }, [setInputText, onTyping]);

  const handleEmojiSelect = (emoji: string) => {
    const newText = localText + emoji;
    setLocalText(newText);
    syncToParent(newText);
  };

  const handleTextChange = (text: string) => {
    setLocalText(text);
    syncToParent(text);
  };

  const handleSendPress = () => {
    const trimmed = localText.trim();
    if (trimmed.length > 0 && !isSending) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      onSend('text', trimmed);
      setLocalText('');
    }
  };

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const bgColor = isDarkMode ? '#000000' : '#f0f0fd';

  return (
    <View style={styles.container}>
      {!isRecording ? (
        <TouchableOpacity 
          onPress={onOpenCamera}
          style={[styles.iconButton, { backgroundColor: isDarkMode ? '#000000' : 'rgba(0,0,0,0.05)' }]}
        >
          <Camera size={22} color={isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton}>
           <Activity size={20} color={primaryColor} />
        </View>
      )}

      <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
        <TextInput
          placeholder={isRecording ? `Recording... ${recordingDuration}s` : "Type a message..."}
          placeholderTextColor="#737580"
          multiline
          value={isRecording ? "" : localText}
          onChangeText={handleTextChange}
          onFocus={() => setShowEmojiPicker(false)}
          editable={!isSending && !isRecording}
          style={[styles.input, { color: textColor, opacity: isRecording ? 0.6 : 1 }]}
        />
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            setShowEmojiPicker(!showEmojiPicker);
          }}
          style={{ paddingHorizontal: 8 }}
        >
           <Smile size={22} color={showEmojiPicker ? (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor) : "#737580"} />
        </TouchableOpacity>
      </View>

      {localText.trim().length > 0 ? (
        <TouchableOpacity 
          onPress={handleSendPress}
          disabled={isSending}
          style={[styles.sendButton, { backgroundColor: isSending ? 'rgba(0,0,0,0.1)' : primaryColor }]}
        >
          <Send size={20} color={getContrastText(primaryColor)} fill={getContrastText(primaryColor)} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
            onLongPress={startRecording}
            onPressOut={stopRecording}
            style={[styles.sendButton, { backgroundColor: isRecording ? '#ff6e85' : (isDarkMode ? '#000000' : 'rgba(0,0,0,0.05)') }]}
            activeOpacity={0.7}
        >
          <Mic size={22} color={isRecording ? 'white' : (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor)} />
        </TouchableOpacity>
      )}

      {showEmojiPicker && (
        <Animated.View 
          entering={SlideInDown} 
          exiting={SlideOutDown}
          style={[styles.emojiPicker, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}
        >
          <View style={styles.emojiHeader}>
            <Text style={{ color: isDarkMode ? '#FFFFFF' : '#1a1c1e', fontWeight: '900', fontSize: 12 }}>EMOJIS</Text>
             <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Text style={{ color: isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor, fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={EMOJIS}
            keyExtractor={item => item}
            numColumns={8}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => handleEmojiSelect(item)}
                style={styles.emojiItem}
              >
                <Text style={{ fontSize: 24 }}>{item}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emojiPicker: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 32,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
    height: 300,
  },
  emojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  emojiItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  }
});

export default React.memo(ChatInput);
