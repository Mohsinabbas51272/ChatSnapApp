import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, ProgressBarAndroid, Platform } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Highlight } from '../../services/stories';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HighlightsViewerProps {
  isVisible: boolean;
  highlight: Highlight | null;
  onClose: () => void;
}

const HighlightsViewer: React.FC<HighlightsViewerProps> = ({ isVisible, highlight, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible && highlight) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [isVisible, highlight]);

  useEffect(() => {
    if (!isVisible || !highlight) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          if (currentIndex < highlight.stories.length - 1) {
            setCurrentIndex(curr => curr + 1);
            return 0;
          } else {
            onClose();
            return 1;
          }
        }
        return prev + 0.02; // Roughly 5 seconds total (0.02 * 50 steps = 1.0)
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isVisible, highlight, currentIndex]);

  if (!highlight) return null;

  const currentStory = highlight.stories[currentIndex];

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View className="flex-1 bg-black">
        <Image source={{ uri: currentStory.imageUri }} className="flex-1" resizeMode="cover" />
        
        <SafeAreaView className="absolute inset-0">
          {/* Progress Bars */}
          <View className="flex-row px-2 pt-2 space-x-1">
            {highlight.stories.map((_, i) => (
              <View key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-white"
                  style={{ 
                    width: i < currentIndex ? '100%' : i === currentIndex ? `${progress * 100}%` : '0%' 
                  }}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between p-6">
            <View>
              <Text className="text-white font-black text-xl shadow-lg">{highlight.name}</Text>
              <Text className="text-white/60 text-xs font-bold shadow-lg">Highlight ⚡</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-black/40 rounded-full border border-white/20">
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Navigation Overlay */}
          <View className="flex-1 flex-row">
            <TouchableOpacity 
              className="flex-1" 
              onPress={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                  setProgress(0);
                }
              }}
            />
            <TouchableOpacity 
              className="flex-1" 
              onPress={() => {
                if (currentIndex < highlight.stories.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                  setProgress(0);
                } else {
                  onClose();
                }
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default HighlightsViewer;
