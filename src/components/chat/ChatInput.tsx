import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, Text, Platform, Keyboard } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Camera, Activity, Smile, Send, Mic } from 'lucide-react-native';
import { Audio } from 'expo-av';

const EMOJIS = [
  '❤️', '😂', '🔥', '👍', '😮', '😢', '😍', '👏', '🙌', '🎉', '✨', '🤔', '😊', '😭', '🙏', '😎',
  '💖', '🤣', '💯', '👊', '🤯', '😡', '🥰', '🤝', '💪', '🎈', '🌟', '🙄', '😌', '😩', '🥺', '😏',
  '🖤', '😅', '💥', '👌', '😴', '🤨', '😘', '✅', '🔥', '🎊', '🌈', '🧐', '😋', '💔', '😇', '👀'
];

interface ChatInputProps {
  primaryColor: string;
  onSend: (type: 'text' | 'voice', mediaUri?: string, duration?: number) => Promise<void>;
  onOpenCamera: () => void;
  onTyping: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  isSending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  primaryColor,
  onSend,
  onOpenCamera,
  onTyping,
  inputText,
  setInputText,
  isSending,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Hide emoji picker if keyboard opens
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (recording) {
        recording.stopAndUnloadAsync().catch(e => console.warn(e));
      }
    };
  }, [recording]);

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
        setRecording(newRecording);
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
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        await onSend('voice', uri, currentDuration);
      }
    } catch (error) {
      console.error('Failed to stop/send recording', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newText = inputText + emoji;
    setInputText(newText);
    onTyping(newText);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    onTyping(text);
  };

  const handleSendPress = () => {
    if (inputText.trim().length > 0 && !isSending) {
      // Clean and trigger send
      onSend('text', inputText.trim());
    }
  };

  return (
    <>
      <View className="flex-row items-end px-4 py-4">
        {!isRecording ? (
          <TouchableOpacity 
            onPress={onOpenCamera}
            className="p-3 rounded-full mr-2"
            style={{ backgroundColor: 'rgba(155,168,255,0.1)' }}
          >
            <Camera size={22} color={primaryColor} />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10 items-center justify-center mr-2">
             <Activity size={20} color={primaryColor} />
          </View>
        )}
        
        <View className="flex-1 min-h-[48px] rounded-3xl bg-surface-container-highest px-4 py-3 flex-row items-end border border-outline-variant/10">
          <TextInput
            className="flex-1 text-onSurface text-[16px] max-h-32 p-0"
            placeholder="Send a chat..."
            placeholderTextColor="#737580"
            multiline
            value={inputText}
            onChangeText={handleTextChange}
            onFocus={() => setShowEmojiPicker(false)}
            editable={!isSending}
          />
          <TouchableOpacity onPress={() => {
            Keyboard.dismiss();
            setShowEmojiPicker(!showEmojiPicker);
          }}>
             <Smile size={22} color={showEmojiPicker ? primaryColor : "#737580"} className="ml-2" />
          </TouchableOpacity>
        </View>

        {inputText.trim().length > 0 ? (
          <TouchableOpacity 
            onPress={handleSendPress}
            disabled={isSending}
            className="w-12 h-12 rounded-full items-center justify-center ml-2 shadow-lg"
            style={{ backgroundColor: isSending ? 'rgba(155,168,255,0.5)' : primaryColor }}
          >
            <Send size={20} color="white" fill="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
              onLongPress={startRecording}
              onPressOut={stopRecording}
              className={`w-12 h-12 rounded-full items-center justify-center ml-2 ${isRecording ? 'scale-125' : ''}`}
              style={{ 
                backgroundColor: isRecording ? '#ff6e85' : 'rgba(155,168,255,0.1)',
                shadowColor: isRecording ? '#ff6e85' : 'transparent',
                shadowOpacity: 0.3,
                shadowRadius: 10,
              }}
          >
            <Mic size={22} color={isRecording ? 'white' : primaryColor} />
          </TouchableOpacity>
        )}
      </View>

      {showEmojiPicker && (
        <Animated.View 
          entering={SlideInDown} 
          exiting={SlideOutDown}
          className="absolute bottom-24 left-4 right-4 bg-surface-container-high rounded-3xl p-4 shadow-2xl border border-outline-variant/10 z-[100]"
        >
          <View className="flex-row items-center justify-between mb-3 px-2">
            <Text className="text-onSurface font-black text-xs uppercase tracking-widest">Trending Emojis</Text>
            <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Text className="text-primary font-bold text-xs">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={EMOJIS}
            keyExtractor={item => item}
            numColumns={8}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => handleEmojiSelect(item)}
                className="flex-1 items-center justify-center py-2"
              >
                <Text className="text-2xl">{item}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </>
  );
};

export default ChatInput;
