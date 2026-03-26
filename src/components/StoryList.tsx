import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Story } from '../services/stories';

interface StoryListProps {
  stories: Story[];
  onAddStory: () => void;
  onViewStory: (story: Story) => void;
  currentUser: any;
}

const storyRingStyle = {
  borderWidth: 0,
  backgroundColor: 'transparent',
  shadowColor: '#4963ff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 3,
};

const storyInnerRingStyle = {
  width: '100%' as const, height: '100%' as const, borderRadius: 999,
  borderWidth: 2, borderColor: '#9ba8ff',
  overflow: 'hidden' as const,
};

const StoryList = React.memo(({ stories, onAddStory, onViewStory, currentUser }: StoryListProps) => {
  const renderStory = useCallback(({ item }: { item: Story }) => (
    <TouchableOpacity onPress={() => onViewStory(item)} className="mr-4 items-center">
      <View className="w-16 h-16 rounded-full p-[3px]" style={storyRingStyle}>
        <View style={storyInnerRingStyle}>
          <View className="w-full h-full rounded-full bg-surface-container overflow-hidden border-2 border-surface">
            <Image source={{ uri: item.imageUri }} className="w-full h-full" />
          </View>
        </View>
      </View>
      <Text className="text-[10px] text-primary mt-2 font-medium uppercase tracking-widest" numberOfLines={1}>
        {item.displayName.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  ), [onViewStory]);

  return (
    <View className="py-6 bg-surface">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={stories}
        keyExtractor={(item, index) => item.id || `story-${index}`}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListHeaderComponent={
          <TouchableOpacity onPress={onAddStory} className="mr-5 items-center">
            <View className="w-16 h-16 rounded-full items-center justify-center border-2 border-dashed border-outline-variant">
              {currentUser.photoURL ? (
                <Image source={{ uri: currentUser.photoURL }} className="w-full h-full rounded-full" />
              ) : (
                <Plus size={24} color="#737580" />
              )}
            </View>
            <Text className="text-[10px] text-onSurface-variant mt-2 font-medium uppercase tracking-widest">Your Snap</Text>
          </TouchableOpacity>
        }
        renderItem={renderStory}
      />
    </View>
  );
});

export default StoryList;
