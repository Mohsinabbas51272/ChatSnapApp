import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, Keyboard, FlatList, Alert, StyleSheet, Image as RNImage, Modal, ScrollView } from 'react-native';
import { Send, Camera, Smile, Mic, Activity, Paperclip, Image as ImageIcon, FileText, X, MapPin, BarChart3, Plus, Trash2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import Animated, { SlideInDown, SlideOutDown, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { isLightColor, getContrastText } from '../../services/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const EMOJIS = [
  '❤️', '😂', '🔥', '👍', '😮', '😢', '😍', '👏', '🙌', '🎉', '✨', '🤔', '😊', '😭', '🙏', '😎',
  '💖', '🤣', '💯', '👊', '🤯', '😡', '🥰', '🤝', '💪', '🎈', '🌟', '🙄', '😌', '😩', '🥺', '😏',
  '🖤', '😅', '💥', '👌', '😴', '🤨', '😘', '✅', '✨', '🎊', '🌈', '🧐', '😋', '💔', '😇', '👀'
];

interface ChatInputProps {
  primaryColor: string;
  isDarkMode: boolean;
  onSend: (type: 'text' | 'voice' | 'snap' | 'image' | 'document' | 'location' | 'poll', mediaUriOrText?: string, duration?: number, extras?: any) => Promise<void>;
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
  const insets = useSafeAreaInsets();
  
  // Poll State (unchanged logic)
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);

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

  const handleCreatePollMessage = () => {
     if (!pollQuestion.trim()) return Alert.alert("Error", "Please enter a question.");
     const validOptions = pollOptions.map(o => o.trim()).filter(o => o.length > 0);
     if (validOptions.length < 2) return Alert.alert("Error", "Please provide at least 2 options.");
     
     onSend('poll', pollQuestion, undefined, { question: pollQuestion, options: validOptions });
     setShowPollModal(false);
     setPollQuestion('');
     setPollOptions(['Yes', 'No']);
  };

  // --- Attach Handlers ---
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
        const docRes = result.assets[0];
        onSend('document', docRes.uri);
      }
    } catch (e) {
      console.error('Document error:', e);
    }
  };

  const handleShareLocation = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Location permission is needed to share your position.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onSend('location', 'Shared Location', undefined, { 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      });
    } catch (e) {
      Alert.alert("Error", "Could not get your location. Please check if your GPS is turned on.");
    }
  };

  const handleCreatePoll = () => {
    setShowAttachMenu(false);
    setShowPollModal(true);
  };

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const accentColor = isLightColor(primaryColor) && !isDarkMode ? '#000000' : (isDarkMode ? '#FFFFFF' : primaryColor);
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const sendButtonColors = isDarkMode ? ['#FFFFFF', '#E0E0E0'] : [primaryColor, `${primaryColor}BD`];
  const sendIconColor = isDarkMode ? '#000000' : getContrastText(primaryColor);

  return (
    <View style={styles.outerContainer}>
      {/* ATTACHMENTS MENU (Floating Above) */}
      {showAttachMenu && (
        <Animated.View 
          entering={SlideInDown.springify().damping(18)} 
          exiting={SlideOutDown.duration(200)}
          style={[styles.attachMenu, { backgroundColor: isDarkMode ? '#1a1c24' : '#FFFFFF' }]}
        >
          <View style={[styles.attachRow, { marginBottom: 16 }]}>
            <TouchableOpacity onPress={handlePickFromGallery} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#3B82F615' }]}>  
                <ImageIcon size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleTakePhoto} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#EF444415' }]}>
                <Camera size={22} color="#EF4444" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePickDocument} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#10B98115' }]}>
                <FileText size={22} color="#10B981" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Doc</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.attachRow}>
            <TouchableOpacity onPress={onOpenCamera} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#F59E0B15' }]}>
                <Camera size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Snap</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShareLocation} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#8B5CF615' }]}>
                <MapPin size={22} color="#8B5CF6" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Live</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCreatePoll} style={styles.attachItem}>
              <View style={[styles.attachIcon, { backgroundColor: '#EC489915' }]}>
                <BarChart3 size={22} color="#EC4899" />
              </View>
              <Text style={[styles.attachLabel, { color: textColor }]}>Poll</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* EMOJI PICKER (Floating Above) */}
      {showEmojiPicker && (
        <Animated.View 
          entering={SlideInDown} 
          exiting={SlideOutDown}
          style={[styles.emojiPicker, { backgroundColor: isDarkMode ? '#1a1c24' : '#FFFFFF' }]}
        >
          <View style={styles.emojiHeader}>
            <Text style={{ color: textColor, fontWeight: '900', fontSize: 10, letterSpacing: 2 }}>EMOJI</Text>
             <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Text style={{ color: accentColor, fontWeight: 'bold' }}>Close</Text>
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

      {/* IMAGE PREVIEW (Sticky within Bar) */}
      {previewImage && (
        <Animated.View 
          entering={FadeIn} 
          exiting={FadeOut}
          style={[styles.previewContainer, { backgroundColor: isDarkMode ? '#1a1c24' : '#FFFFFF', borderColor: isDarkMode ? 'rgba(0,0,0,0.5)' : '#EEE' }]}
        >
          <RNImage source={{ uri: previewImage }} style={styles.previewImage} resizeMode="cover" />
          <TouchableOpacity 
            onPress={() => setPreviewImage(null)} 
            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* MAIN INPUT BAR (Pill Style) */}
      <View style={styles.inputRow}>
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            setShowEmojiPicker(false);
            setShowAttachMenu(!showAttachMenu);
          }}
          className="w-11 h-11 items-center justify-center rounded-2xl mr-2"
          style={{ backgroundColor: showAttachMenu ? `${primaryColor}20` : inputBg }}
        >
          <Paperclip size={20} color={showAttachMenu ? accentColor : subTextColor} />
        </TouchableOpacity>

        <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
          <TouchableOpacity onPress={() => {
            Keyboard.dismiss();
            setShowAttachMenu(false);
            setShowEmojiPicker(!showEmojiPicker);
          }} className="p-2">
            <Smile size={20} color={showEmojiPicker ? accentColor : subTextColor} />
          </TouchableOpacity>

          <TextInput
            placeholder={isRecording ? `0:${recordingDuration < 10 ? '0' : ''}${recordingDuration} Rec` : "Say something..."}
            placeholderTextColor={subTextColor}
            multiline
            value={isRecording ? "" : localText}
            onChangeText={handleTextChange}
            onFocus={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}
            editable={!isSending && !isRecording}
            style={[styles.inputField, { color: textColor }]}
          />
        </View>

        <TouchableOpacity 
          onPress={localText.trim().length > 0 ? handleSendPress : undefined}
          onLongPress={localText.trim().length === 0 ? startRecording : undefined}
          onPressOut={localText.trim().length === 0 ? stopRecording : undefined}
          disabled={isSending}
          className="ml-2 overflow-hidden rounded-full"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={sendButtonColors}
            style={styles.sendGradient}
          >
            {isSending ? (
              <Activity size={18} color={sendIconColor} />
            ) : localText.trim().length > 0 ? (
              <Send size={18} color={sendIconColor} fill={sendIconColor} />
            ) : (
              <Mic size={20} color={isRecording ? '#ff4d4d' : sendIconColor} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
    paddingRight: 12,
    lineHeight: 20,
  },
  sendGradient: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMenu: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 32,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  attachRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachItem: {
    alignItems: 'center',
    width: 60,
  },
  attachIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  attachLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  emojiPicker: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 32,
    width: '100%',
    height: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    paddingVertical: 10,
  },
  previewContainer: {
    width: 140,
    height: 140,
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  }
});

export default React.memo(ChatInput);
