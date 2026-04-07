import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, Keyboard, FlatList, Alert, StyleSheet, Image as RNImage } from 'react-native';
import { Send, Camera, Smile, Mic, Activity, Paperclip, Image as ImageIcon, FileText, X } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { SlideInDown, SlideOutDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { isLightColor, getContrastText } from '../../services/colors';

const EMOJIS = [
  '❤️', '😂', '🔥', '👍', '😮', '😢', '😍', '👏', '🙌', '🎉', '✨', '🤔', '😊', '😭', '🙏', '😎',
  '💖', '🤣', '💯', '👊', '🤯', '😡', '🥰', '🤝', '💪', '🎈', '🌟', '🙄', '😌', '😩', '🥺', '😏',
  '🖤', '😅', '💥', '👌', '😴', '🤨', '😘', '✅', '🔥', '🎊', '🌈', '🧐', '😋', '💔', '😇', '👀'
];

interface ChatInputProps {
  primaryColor: string;
  isDarkMode: boolean;
  onSend: (type: 'text' | 'voice' | 'snap' | 'image' | 'document', mediaUriOrText?: string, duration?: number) => Promise<void>;
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localText, setLocalText] = useState(inputText);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
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
    if (previewImage) {
      onSend('image', previewImage);
      setPreviewImage(null);
      return;
    }
    const trimmed = localText.trim();
    if (trimmed.length > 0 && !isSending) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      onSend('text', trimmed);
      setLocalText('');
    }
  };

  // --- Media Handlers ---
  const handlePickFromGallery = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Gallery access is needed to share photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
    }
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Camera error:', e);
    }
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        const fileName = doc.name || 'Document';
        // Send the document name as a text message with the URI
        onSend('document', doc.uri);
      }
    } catch (e) {
      console.error('Document pick error:', e);
    }
  };

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const bgColor = isDarkMode ? '#000000' : '#f0f0fd';
  const accentColor = isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor;

  return (
    <View style={styles.container}>
      {/* IMAGE PREVIEW */}
      {previewImage && (
        <Animated.View 
          entering={SlideInDown.springify()} 
          exiting={SlideOutDown}
          style={[styles.previewContainer, { backgroundColor: isDarkMode ? '#0a0a0a' : '#FFFFFF', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
        >
          <RNImage source={{ uri: previewImage }} style={styles.previewImage} resizeMode="cover" />
          <TouchableOpacity 
            onPress={() => setPreviewImage(null)} 
            style={[styles.previewClose, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSendPress}
            disabled={isSending}
            style={[styles.previewSend, { backgroundColor: primaryColor }]}
          >
            <Send size={18} color={getContrastText(primaryColor)} fill={getContrastText(primaryColor)} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* MAIN INPUT ROW */}
      {!previewImage && (
        <View style={styles.inputRow}>
          {!isRecording ? (
            <TouchableOpacity 
              onPress={() => {
                Keyboard.dismiss();
                setShowEmojiPicker(false);
                setShowAttachMenu(!showAttachMenu);
              }}
              style={[styles.iconButton, { backgroundColor: isDarkMode ? '#000000' : 'rgba(0,0,0,0.05)' }]}
            >
              <Paperclip size={22} color={showAttachMenu ? accentColor : (isDarkMode ? '#737580' : '#555')} />
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
              onFocus={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}
              editable={!isSending && !isRecording}
              style={[styles.input, { color: textColor, opacity: isRecording ? 0.6 : 1 }]}
            />
            <TouchableOpacity 
              onPress={() => {
                Keyboard.dismiss();
                setShowAttachMenu(false);
                setShowEmojiPicker(!showEmojiPicker);
              }}
              style={{ paddingHorizontal: 8 }}
            >
               <Smile size={22} color={showEmojiPicker ? accentColor : "#737580"} />
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
              <Mic size={22} color={isRecording ? 'white' : accentColor} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ATTACHMENTS MENU */}
      {showAttachMenu && (
        <Animated.View 
          entering={SlideInDown.springify().damping(18)} 
          exiting={SlideOutDown.duration(200)}
          style={[styles.attachMenu, { backgroundColor: isDarkMode ? '#0a0a0a' : '#FFFFFF' }]}
        >
          <View style={styles.attachRow}>
            <TouchableOpacity onPress={handlePickFromGallery} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#6C63FF20' }]}>  
                <ImageIcon size={24} color="#6C63FF" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleTakePhoto} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#FF636320' }]}>
                <Camera size={24} color="#FF6363" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePickDocument} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#4CAF5020' }]}>
                <FileText size={24} color="#4CAF50" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Document</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onOpenCamera} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#FF980020' }]}>
                <Camera size={24} color="#FF9800" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Snap</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* EMOJI PICKER */}
      {showEmojiPicker && (
        <Animated.View 
          entering={SlideInDown} 
          exiting={SlideOutDown}
          style={[styles.emojiPicker, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}
        >
          <View style={styles.emojiHeader}>
            <Text style={{ color: isDarkMode ? '#FFFFFF' : '#1a1c1e', fontWeight: '900', fontSize: 12 }}>EMOJIS</Text>
             <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Text style={{ color: accentColor, fontWeight: 'bold' }}>Done</Text>
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
    // Outer wrapper
  },
  inputRow: {
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
  // Attach Menu
  attachMenu: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  attachRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attachItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Preview
  previewContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 24,
  },
  previewClose: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSend: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Emoji
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
