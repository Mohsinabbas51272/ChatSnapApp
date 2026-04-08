import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, Grid, Image as ImageIcon, Video } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchChatMedia, Message } from '../services/messaging';
import ScreenBackground from '../components/ui/ScreenBackground';
import Header from '../components/ui/Header';
import MediaViewerModal from '../components/chat/MediaViewerModal';
import { useResponsive } from '../hooks/useResponsive';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

const MediaGalleryScreen = ({ route, navigation }: any) => {
  const { conversationId, partnerName } = route.params;
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const [media, setMedia] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Message | null>(null);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const data = await fetchChatMedia(conversationId);
        setMedia(data);
      } catch (error) {
        console.error('Failed to load gallery:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
  }, [conversationId]);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <ScreenBackground>
      <View className="flex-1">
        <Header 
          title="Shared Media" 
          subtitle={partnerName}
          showBack 
          navigation={navigation}
          rightElement={
             <View className="p-2.5 rounded-full bg-white/10">
                <Grid size={20} color="#FFF" />
             </View>
          }
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={primaryColor} size="large" />
          </View>
        ) : media.length > 0 ? (
          <FlatList
            data={media}
            keyExtractor={(item) => item.id!}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setSelectedItem(item)}
                style={styles.gridItem}
              >
                <Image 
                  source={{ uri: item.text }} 
                  style={styles.image}
                  resizeMode="cover"
                />
                {item.type === 'snap' && (
                   <View style={styles.snapBadge}>
                      <ImageIcon size={12} color="#FFF" />
                   </View>
                )}
              </TouchableOpacity>
            )}
            ListHeaderComponent={
               <View className="px-6 py-4">
                  <Text className="text-[10px] font-black uppercase tracking-widest" style={{ color: subTextColor }}>
                     {media.length} ITEMS SHARED
                  </Text>
               </View>
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center p-10">
            <View className="w-20 h-20 rounded-[30px] bg-gray-500/10 items-center justify-center mb-6">
                <ImageIcon size={40} color={subTextColor} />
            </View>
            <Text className="text-xl font-bold text-center" style={{ color: textColor }}>No Media Yet</Text>
            <Text className="text-center mt-2" style={{ color: subTextColor }}>
              Photos and snaps shared in this chat will appear here.
            </Text>
          </View>
        )}

        <MediaViewerModal 
          isVisible={!!selectedItem}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          primaryColor={primaryColor}
        />
      </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  image: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  snapBadge: {
     position: 'absolute',
     bottom: 8,
     right: 8,
     backgroundColor: 'rgba(0,0,0,0.5)',
     padding: 4,
     borderRadius: 6,
  }
});

export default MediaGalleryScreen;
