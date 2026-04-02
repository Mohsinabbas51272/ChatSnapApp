import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Story } from '../services/stories';
import { useResponsive } from '../hooks/useResponsive';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { isLightColor, getContrastText } from '../services/colors';

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
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  
  const STORY_SIZE = isTablet ? 80 : 64;
  const INNER_SIZE = isTablet ? 72 : 58;

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  const renderStory = useCallback(({ item }: { item: GroupedStory }) => {
    // Determine color based on whether any stories are unread
    const borderColor = item.hasUnread ? (isDarkMode ? '#FFFFFF' : (isLightColor(primaryColor) ? '#E0E0E0' : primaryColor)) : (isDarkMode ? '#333333' : '#E8EAF6');
    
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
            <View 
              className="w-full h-full rounded-full overflow-hidden border-2"
              style={{ backgroundColor: isDarkMode ? '#000000' : '#FFFFFF', borderColor: isDarkMode ? '#000000' : '#FFFFFF' }}
            >
              <Image source={{ uri: item.userPhoto || item.stories?.[0]?.imageUri }} className="w-full h-full" />
            </View>
          </View>
        </View>
        <Text 
          className={`${isTablet ? 'text-xs' : 'text-[10px]'} mt-2 font-black uppercase tracking-widest`} 
          numberOfLines={1}
          style={{ color: isDarkMode ? '#FFFFFF' : (isLightColor(primaryColor) ? '#000000' : primaryColor) }}
        >
          {item.displayName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  }, [onViewStory, isDarkMode, primaryColor]);

  return (
    <View className="py-6" style={{ backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={groupedStories}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListHeaderComponent={
          <TouchableOpacity onPress={onAddStory} className="mr-5 items-center">
            <View 
              className="rounded-full items-center justify-center border-2 border-dashed"
              style={{ 
                width: STORY_SIZE, height: STORY_SIZE, 
                borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                backgroundColor: isDarkMode ? '#121212' : '#F8F9FF'
              }}
            >
              {currentUser.photoURL ? (
                <Image 
                  source={{ uri: currentUser.photoURL }} 
                  className="w-full h-full rounded-full" 
                />
              ) : (
                <Plus size={isTablet ? 30 : 24} color={isDarkMode ? 'white' : '#737580'} />
              )}
            </View>
            <Text 
              className={`${isTablet ? 'text-xs' : 'text-[10px]'} mt-2 font-medium uppercase tracking-widest`}
              style={{ color: isDarkMode ? '#FFFFFF' : '#737580' }}
            >
              Your Snap
            </Text>
          </TouchableOpacity>
        }
        renderItem={renderStory}
      />
    </View>
  );
});

export default StoryList;

