import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Story } from '../services/stories';
import { useResponsive } from '../hooks/useResponsive';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface GroupedStory {
  userId: string;
  displayName: string;
  userPhoto?: string;
  stories: Story[];
  hasUnread: boolean;
}

interface StoryListProps {
  groupedStories: GroupedStory[];
  onAddStory: () => void;
  onViewStory: (stories: Story[], initialIndex: number) => void;
  currentUser: {
    uid: string | null;
    photoURL: string | null;
  };
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

const StoryList = React.memo(({ groupedStories, onAddStory, onViewStory, currentUser }: StoryListProps) => {
  const { isTablet } = useResponsive();
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  
  const STORY_SIZE = isTablet ? 80 : 64;
  const INNER_SIZE = isTablet ? 72 : 58;

  const renderStory = useCallback(({ item }: { item: GroupedStory }) => {
    // Determine color based on whether any stories are unread
    const borderColor = item.hasUnread ? '#9ba8ff' : '#44475a';
    
    return (
      <TouchableOpacity onPress={() => onViewStory(item.stories, 0)} className="mr-4 items-center">
        <View 
          className="rounded-full p-[3px]" 
          style={[
            item.hasUnread ? storyRingStyle : undefined,
            { width: STORY_SIZE, height: STORY_SIZE }
          ]}
        >
          <View style={{
            width: '100%', height: '100%', borderRadius: 999,
            borderWidth: 2, borderColor,
            overflow: 'hidden'
          }}>
            <View className="w-full h-full rounded-full bg-surface-container overflow-hidden border-2 border-surface">
              <Image source={{ uri: item.userPhoto || item.stories?.[0]?.imageUri }} className="w-full h-full" />
            </View>
          </View>
        </View>
        <Text className={`${isTablet ? 'text-xs' : 'text-[10px]'} text-primary mt-2 font-medium uppercase tracking-widest`} numberOfLines={1}>
          {item.displayName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  }, [onViewStory]);

  return (
    <View className="py-6 bg-surface">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={groupedStories}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListHeaderComponent={
          <TouchableOpacity onPress={onAddStory} className="mr-5 items-center">
            <View 
              className="rounded-full items-center justify-center border-2 border-dashed border-outline-variant"
              style={{ width: STORY_SIZE, height: STORY_SIZE }}
            >
              {currentUser.photoURL ? (
                <Image 
                  source={{ uri: currentUser.photoURL }} 
                  className="w-full h-full rounded-full" 
                />
              ) : (
                <Plus size={isTablet ? 30 : 24} color="#737580" />
              )}
            </View>
            <Text className={`${isTablet ? 'text-xs' : 'text-[10px]'} text-onSurface-variant mt-2 font-medium uppercase tracking-widest`}>Your Snap</Text>
          </TouchableOpacity>
        }
        renderItem={renderStory}
      />
    </View>
  );
});

export default StoryList;

