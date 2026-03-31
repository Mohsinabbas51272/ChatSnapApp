import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Modal, Text, Dimensions, AppState, BackHandler, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface SnapViewerProps {
  isVisible: boolean;
  stories?: import('../services/stories').Story[];
  initialIndex?: number;
  duration: number;
  onFinish: () => void;
  onInterrupted?: () => void;
  onDelete?: (story: import('../services/stories').Story) => void;
  isPaused?: boolean;
  userId?: string;
  onReply?: (text: string, story: import('../services/stories').Story) => void;
  onView?: (story: import('../services/stories').Story) => void;
  // Single snap mode props (used from ChatScreen)
  imageUri?: string;
  filter?: string;
}

const { width } = Dimensions.get('window');

import { Sparkles, Smile, Glasses, User, Image as ImageIcon, Trash, ChevronLeft, Eye, Clock, Send } from 'lucide-react-native';

const SnapViewer = React.memo(({ isVisible, stories: storiesProp, initialIndex = 0, duration, onFinish, onInterrupted, onDelete, isPaused, userId = '', onReply, onView, imageUri: singleImageUri, filter: singleFilter }: SnapViewerProps) => {
  // Support both multi-story mode and single-snap mode (ChatScreen)
  const stories: import('../services/stories').Story[] = React.useMemo(() => {
    if (storiesProp && storiesProp.length > 0) return storiesProp;
    if (singleImageUri) {
      return [{
        id: 'single-snap',
        userId: '',
        displayName: '',
        imageUri: singleImageUri,
        timestamp: null,
        filter: singleFilter || 'none',
      } as any];
    }
    return [];
  }, [storiesProp, singleImageUri, singleFilter]);

  const isSingleSnapMode = !storiesProp && !!singleImageUri;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const progress = useSharedValue(1);
  
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  
  const interruptedRef = useRef(onInterrupted);
  interruptedRef.current = onInterrupted;

  useEffect(() => {
    const onBackPress = () => {
      if (isVisible) {
        finishRef.current();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState !== 'active' && isVisible) {
          interruptedRef.current?.();
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, [isVisible]);

  // Sync initial index when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(initialIndex);
      setTimeLeft(duration);
      progress.value = 1;
      setShowViewers(false);
      setIsTyping(false);
      setReplyText('');
    }
  }, [isVisible, initialIndex, duration]);

  const currentStory = stories?.[currentIndex];
  const imageUri = currentStory?.imageUri;
  const filter = (currentStory as any)?.filter;
  const viewers = Array.isArray(currentStory?.viewers) ? currentStory.viewers : [];
  
  const isOwner = currentStory && String(currentStory.userId) === String(userId);

  // Track views automatically as the index changes
  useEffect(() => {
    if (isVisible && stories && currentIndex >= stories.length) {
       if (stories.length === 0) {
          finishRef.current();
       } else {
          setCurrentIndex(stories.length - 1);
          setTimeLeft(duration);
          progress.value = 1;
       }
    } else if (isVisible && currentStory) {
      onView?.(currentStory);
    }
  }, [isVisible, currentIndex, stories, currentStory, duration]);

  const handleNext = React.useCallback(() => {
     if (!stories || stories.length === 0) {
        finishRef.current();
        return;
     }
     if (currentIndex < stories.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(duration);
        progress.value = 1;
     } else {
        finishRef.current();
     }
  }, [currentIndex, stories, duration]);

  const handlePrev = React.useCallback(() => {
     if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setTimeLeft(duration);
        progress.value = 1;
     } else {
        setTimeLeft(duration);
        progress.value = 1;
     }
  }, [currentIndex, duration]);

  useEffect(() => {
    if (isVisible && !isPaused && !showViewers && !isTyping) {
      // Resume animation from current timeLeft
      progress.value = withTiming(0, {
        duration: timeLeft * 1000,
        easing: Easing.linear,
      });

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(handleNext, 0); // Advance to next story
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    } else {
      // Pause animation
      progress.value = progress.value; 
    }
  }, [isVisible, isPaused, showViewers, isTyping, handleNext]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${(progress.value || 0) * 100}%`,
  }));

  if (!stories || stories.length === 0 || !currentStory) return null;

  return (
    <Modal visible={isVisible} transparent={false} animationType="fade" onRequestClose={onFinish}>
      <View className="flex-1 bg-surface">
        <Image source={{ uri: imageUri }} className="flex-1" resizeMode="cover" />

        {/* Navigation Tap Zones */}
        <TouchableOpacity 
          className="absolute top-24 bottom-24 left-0 w-[40%]" 
          style={{ zIndex: 90 }} 
          onPress={handlePrev} 
        />
        <TouchableOpacity 
          className="absolute top-24 bottom-24 right-0 w-[40%]" 
          style={{ zIndex: 90 }} 
          onPress={handleNext} 
        />
        
        {/* Render Saved Filter Overlays */}
        {filter === 'vintage' && <View className="absolute inset-0 bg-orange-500/10" pointerEvents="none" />}
        {filter === 'bw' && <View className="absolute inset-0 bg-black/20" pointerEvents="none" />}
        {filter === 'glasses' && (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
             <Glasses color="white" size={120} strokeWidth={2} style={{ marginTop: -50 }} />
          </View>
        )}
        {filter === 'smile' && (
             <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                <Smile color="#e966ff" size={100} style={{ marginTop: 20 }} />
             </View>
        )}
        {/* Glassmorphic overlay with gradient */}
        <View className="absolute inset-0 bg-surface/40" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }} pointerEvents="none" />
        <SafeAreaView className="absolute top-0 left-0 right-0 p-4" style={{ zIndex: 100 }}>
          <View className="flex-row justify-between items-center px-1">
             <TouchableOpacity 
                onPress={onFinish}
                className="w-10 h-10 mr-2 rounded-full items-center justify-center bg-black/20"
             >
                <ChevronLeft size={24} color="white" />
             </TouchableOpacity>
             <View className="flex-1 mr-4 flex-row">
                {stories.map((s, idx) => (
                  <View key={s.id || idx} className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden ml-1">
                    {idx === currentIndex ? (
                      <Animated.View className="h-full rounded-full" style={[progressStyle, { backgroundColor: '#9ba8ff' }]} />
                    ) : (
                      <View className="h-full rounded-full" style={{ backgroundColor: idx < currentIndex ? '#9ba8ff' : 'transparent' }} />
                    )}
                  </View>
                ))}
             </View>
              {!isSingleSnapMode && isOwner && onDelete && (
                <TouchableOpacity 
                   onPress={() => onDelete(currentStory)}
                   activeOpacity={0.7}
                   className="w-10 h-10 ml-3 rounded-full items-center justify-center bg-black/20"
                >
                   <Trash size={18} color="white" />
                </TouchableOpacity>
              )}
          </View>
        </SafeAreaView>

        {/* View Count at Bottom (Owner only, not in single snap mode) */}
        {!isSingleSnapMode && !showViewers && isOwner && (
          <SafeAreaView className="absolute bottom-6 left-0 right-0 items-center">
            <TouchableOpacity 
              onPress={() => setShowViewers(true)}
              className="flex-row items-center bg-black/40 px-6 py-3 rounded-full border border-white/10"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            >
              <Eye size={18} color="white" />
              <Text className="text-white font-black ml-2 text-sm">{viewers.length} Views</Text>
              <View className="w-1 h-1 bg-white/40 rounded-full mx-3" />
              <Text className="text-white/60 font-bold text-xs">
                {viewers.find(v => v.userId === userId)?.count || 0} Own Views
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}

        {/* Viewers List (Slide-up style) */}
        {showViewers && (
          <View className="absolute inset-0 bg-black/60 z-[200] justify-end">
            <TouchableOpacity 
              className="absolute inset-0" 
              activeOpacity={1} 
              onPress={() => setShowViewers(false)} 
            />
            <Animated.View 
              entering={SlideInDown}
              className="bg-surface-container-high rounded-t-[40px] p-6 max-h-[70%]"
            >
              <View className="w-12 h-1 bg-outline-variant/30 self-center rounded-full mb-6" />
              
              <View className="flex-row justify-between items-end mb-8 px-2">
                <View>
                  <Text className="text-onSurface font-black text-3xl tracking-tighter">Viewers</Text>
                  <Text className="text-primary font-bold text-sm tracking-widest uppercase mt-1">
                    {viewers.length} total people
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowViewers(false)}
                  className="bg-primary/10 px-4 py-2 rounded-full"
                >
                  <Text className="text-primary font-black text-xs uppercase">Close</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-6 bg-surface-container/60 p-4 rounded-3xl border border-outline-variant/5">
                <View className="flex-1 items-center border-r border-outline-variant/10">
                  <Text className="text-onSurface font-black text-xl">{viewers.length}</Text>
                  <Text className="text-onSurface-variant text-[10px] font-bold uppercase mt-1">People</Text>
                </View>
                <View className="flex-1 items-center border-r border-outline-variant/10">
                  <Text className="text-onSurface font-black text-xl">
                    {viewers.reduce((acc, v) => acc + (v.count || 0), 0)}
                  </Text>
                  <Text className="text-onSurface-variant text-[10px] font-bold uppercase mt-1">Total Views</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-primary font-black text-xl">
                    {viewers.find(v => v.userId === userId)?.count || 0}
                  </Text>
                  <Text className="text-onSurface-variant text-[10px] font-bold uppercase mt-1">Own Views</Text>
                </View>
              </View>

              <FlatList
                data={viewers}
                keyExtractor={item => item.userId}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }: { item: import('../services/stories').StoryViewerInfo }) => (
                  <View className="flex-row items-center py-4 px-4 bg-surface-container/30 rounded-2xl mb-3 border border-outline-variant/5">
                    <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4">
                      <User size={20} color="#9ba8ff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-onSurface font-bold text-base">{item.displayName}</Text>
                      <View className="flex-row items-center mt-0.5">
                        <Clock size={10} color="#737580" />
                        <Text className="text-onSurface-variant text-[10px] font-medium ml-1">
                          Last seen {new Date(item.lastViewed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/10">
                      <Text className="text-primary font-black text-xs">{item.count}×</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View className="py-20 items-center">
                    <Text className="text-onSurface-variant font-bold text-center">No views yet!</Text>
                    <Text className="text-onSurface-variant text-xs mt-1">Check back later for updates.</Text>
                  </View>
                }
              />
            </Animated.View>
          </View>
        )}

        {/* Story Reply Input (Only for non-owners, not in single snap mode) */}
        {!isSingleSnapMode && !isOwner && !showViewers && (
          <View 
            className="absolute bottom-10 left-0 right-0 px-6 flex-row items-center"
            style={{ zIndex: 110 }}
          >
            <View className="flex-1 bg-black/30 rounded-full px-5 py-3 border border-white/20 flex-row items-center h-14 backdrop-blur-md">
              <TextInput
                className="flex-1 text-white text-base font-medium p-0"
                placeholder="Reply to Story..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
              />
            </View>
            {replyText.trim().length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  onReply?.(replyText, currentStory);
                  setReplyText('');
                  onFinish(); // Close viewer after reply
                }}
                className="w-14 h-14 bg-primary rounded-full items-center justify-center ml-3 shadow-xl"
              >
                <Send size={20} color="white" fill="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
});

export default SnapViewer;
