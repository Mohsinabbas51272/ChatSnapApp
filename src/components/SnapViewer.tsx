import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Modal, Text, Dimensions, AppState, BackHandler, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface SnapViewerProps {
  isVisible: boolean;
  imageUri: string;
  duration: number;
  filter?: string;
  onFinish: () => void;
  onInterrupted?: () => void;
  onDelete?: () => void;
  isPaused?: boolean;
}

const { width } = Dimensions.get('window');

import { Sparkles, Smile, Glasses, User, Image as ImageIcon, Trash } from 'lucide-react-native';

const SnapViewer = React.memo(({ isVisible, imageUri, duration, filter, onFinish, onInterrupted, onDelete, isPaused }: SnapViewerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
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

  useEffect(() => {
    if (isVisible && !isPaused) {
      setTimeLeft(duration);
      progress.value = 1;
      progress.value = withTiming(0, {
        duration: duration * 1000,
        easing: Easing.linear,
      });

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            finishRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    } else if (isPaused) {
      // Pause animation
      progress.value = progress.value; 
    }
  }, [isVisible, isPaused, duration]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Modal visible={isVisible} transparent={false} animationType="fade">
      <View className="flex-1 bg-surface">
        <Image source={{ uri: imageUri }} className="flex-1" resizeMode="cover" />
        
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
          <View className="flex-row justify-between items-center px-2">
             <View className="flex-1 mr-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <Animated.View 
                  className="h-full rounded-full" 
                  style={[progressStyle, { backgroundColor: '#9ba8ff' }]} 
                />
             </View>
              <View className="w-10 h-10 rounded-full items-center justify-center border-2 border-primary/20"
                    style={{ backgroundColor: 'rgba(17,19,29,0.6)' }}>
                <Text className="text-primary font-black text-lg">{timeLeft}</Text>
              </View>
              {onDelete && (
                <TouchableOpacity 
                   onPress={onDelete}
                   activeOpacity={0.7}
                   className="w-10 h-10 ml-3 rounded-full items-center justify-center"
                   style={{ backgroundColor: 'rgba(255, 59, 48, 0.8)', zIndex: 999 }}
                >
                   <Trash size={18} color="white" />
                </TouchableOpacity>
              )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
});

export default SnapViewer;
