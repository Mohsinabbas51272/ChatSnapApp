import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Smile, Plus, Camera, Eye, EyeOff, X } from 'lucide-react-native';
import { db } from '../services/firebaseConfig';
import { onSnapshot, doc } from 'firebase/firestore';
import { setUserMood } from '../services/messaging';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface MoodData {
  uid: string;
  name: string;
  mood: string;
  emoji: string;
}

const MoodTicker = ({ friendIds }: { friendIds: string[] }) => {
  const [moods, setMoods] = useState<MoodData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [moodEmoji, setMoodEmoji] = useState('😊');
  
  const currentUser = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const insets = useSafeAreaInsets();

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const surfaceLow = isDarkMode ? '#121212' : '#F5F5F5';

  // Subscribe to moods of friends + Current User
  useEffect(() => {
    const idsToWatch = [...friendIds];
    if (currentUser.uid && !idsToWatch.includes(currentUser.uid)) {
      idsToWatch.push(currentUser.uid);
    }

    if (!idsToWatch.length) {
      setMoods([]);
      return;
    }

    const unsubs = idsToWatch.map(id => {
      return onSnapshot(doc(db, 'users', id), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const expiresAt = data.moodStatus?.expiresAt?.toDate?.() || (data.moodStatus?.expiresAt?.seconds ? new Date(data.moodStatus.expiresAt.seconds * 1000) : null);
          const isExpired = expiresAt && expiresAt < new Date();

          if (data.moodStatus?.text && !isExpired) {
            setMoods(prev => {
              const other = prev.filter(m => m.uid !== id);
              return [...other, { 
                uid: id, 
                name: id === currentUser.uid ? 'You' : (data.displayName || 'Friend'), 
                mood: data.moodStatus.text, 
                emoji: data.moodStatus.emoji || '😊' 
              }].sort((a, b) => (a.uid === currentUser.uid ? -1 : 1));
            });
          } else {
            setMoods(prev => prev.filter(m => m.uid !== id));
          }
        }
      });
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [friendIds, currentUser.uid]);

  // Auto-slide logic
  useEffect(() => {
    if (moods.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % moods.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [moods]);

  const formatMoodSentence = (m: MoodData) => {
    const isMe = m.uid === currentUser.uid;
    const name = isMe ? 'You' : m.name;
    const verb = isMe ? 'are' : 'is';
    const mood = m.mood.toLowerCase().trim();
    
    // Intelligent sentence building
    if (mood.includes('driving') || mood.includes('riding')) return `${name} ${verb} ${mood} now ${m.emoji}`;
    if (mood.includes('eating') || mood.includes('cooking')) return `${name} ${verb} ${mood} ${m.emoji}`;
    if (mood.includes('sleeping') || mood.includes('resting')) return `${name} ${verb} ${mood} ${m.emoji}`;
    if (mood.includes('place') || mood.includes('at ') || mood.includes('in ')) return `${name} ${verb} now at ${mood.replace('at ', '').replace('now ', '')} ${m.emoji}`;
    if (mood.includes('gaming') || mood.includes('playing')) return `${name} ${verb} ${mood} ${m.emoji}`;
    
    return `${name} ${verb} ${mood} ${m.emoji}`;
  };

  const currentMood = moods[currentIndex] || null;

  return (
    <View style={[styles.container, { bottom: (insets.bottom > 0 ? insets.bottom : 20) + 70 }]}>
      <TouchableOpacity 
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
        style={[styles.tickerBar, { 
          backgroundColor: isDarkMode ? 'rgba(25, 25, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderRadius: 28,
        }]}
      >
        <View className="flex-row items-center flex-1 px-4">
          <View style={[styles.pulseCircle, { backgroundColor: `${primaryColor}20` }]}>
            <Smile size={18} color={primaryColor} />
          </View>
          
          <View className="flex-1 ml-3 overflow-hidden h-6 justify-center">
            {moods.length > 0 ? (
              <Animated.View 
                key={currentIndex}
                entering={FadeInUp.duration(400)}
                exiting={FadeOutDown.duration(400)}
                className="flex-row items-center"
              >
                <Text style={[styles.moodText, { color: textColor }]}>
                   {formatMoodSentence(currentMood!)}
                </Text>
              </Animated.View>
            ) : (
              <Text style={[styles.placeholder, { color: subTextColor }]}>
                What's your mood? Tap to share...
              </Text>
            )}
          </View>

          <View className="flex-row items-center ml-2">
             <View className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
             <Text className="text-[10px] font-black uppercase tracking-tighter text-primary">{moods.length} Active</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* SHARE MOOD MODAL */}
      <Modal animationType="fade" transparent={true} visible={showModal} onRequestClose={() => setShowModal(false)}>
          <TouchableOpacity className="flex-1 bg-black/80 items-center justify-center p-6" activeOpacity={1} onPress={() => setShowModal(false)}>
              <Animated.View 
                entering={SlideInDown.springify()}
                exiting={SlideOutDown}
                className={`rounded-[40px] p-8 w-full`} 
                style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }} 
                onStartShouldSetResponder={() => true} 
                onResponderRelease={(e) => e.stopPropagation()}
              >
                  <View className="items-center mb-6">
                      <View className="w-16 h-16 rounded-full items-center justify-center mb-4 border border-primary/20" style={{ backgroundColor: `${primaryColor}10` }}>
                          <Smile size={32} color={primaryColor} />
                      </View>
                      <Text className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Daily Mood</Text>
                      <Text className="text-sm mt-2 text-center leading-5" style={{ color: subTextColor }}>What's happening right now? Status expires in 3 hours.</Text>
                  </View>

                  <View className="flex-row justify-center mb-6 flex-wrap">
                    {['😊', '🔥', '🚀', '😴', '🎮', '🍱', '🚗', '🍕'].map(emoji => (
                      <TouchableOpacity 
                        key={emoji} 
                        onPress={() => setMoodEmoji(emoji)}
                        className={`w-12 h-12 m-1 rounded-full items-center justify-center ${moodEmoji === emoji ? 'border-2' : ''}`}
                        style={{ borderColor: primaryColor, backgroundColor: moodEmoji === emoji ? `${primaryColor}10` : 'transparent' }}
                      >
                        <Text className="text-2xl">{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View className="w-full mb-6">
                      <TextInput
                          className="w-full py-4 px-6 rounded-2xl text-lg font-bold"
                          style={{ backgroundColor: surfaceLow, color: textColor }}
                          placeholder="I'm feeling..."
                          placeholderTextColor={subTextColor}
                          maxLength={30}
                          value={moodText}
                          onChangeText={setMoodText}
                      />
                  </View>

                  <TouchableOpacity 
                    onPress={async () => {
                      if (!moodText.trim()) return;
                      await setUserMood(currentUser.uid!, moodText, moodEmoji);
                      setShowModal(false);
                      setMoodText('');
                    }} 
                    className="w-full py-4 rounded-2xl items-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                      <Text className="text-white font-bold text-base uppercase tracking-widest">Share with Friends</Text>
                  </TouchableOpacity>
              </Animated.View>
          </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    width: '92%',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tickerBar: {
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pulseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  placeholder: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    opacity: 0.6,
  }
});

export default React.memo(MoodTicker);
