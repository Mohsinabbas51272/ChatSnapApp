import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Search, X, User, Users, MessageSquare, ArrowRight, History } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { searchGlobal, SearchResult } from '../services/search';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { getContrastText } from '../services/colors';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ visible, onClose, navigation }) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'All' | 'People' | 'Groups'>('All');

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceHigh = isDarkMode ? '#1A1C24' : '#F0F2FA';

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      const searchResults = await searchGlobal(query);
      setResults(searchResults);
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const filteredResults = results.filter(r => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'People') return r.type === 'user';
    if (activeCategory === 'Groups') return r.type === 'group';
    return true;
  });

  const handleSelect = (item: SearchResult) => {
    onClose();
    if (item.type === 'user') {
      navigation.navigate('Chat', { user: item.data });
    } else if (item.type === 'group') {
      navigation.navigate('Chat', { group: item.data });
    }
  };

  const categories: ('All' | 'People' | 'Groups')[] = ['All', 'People', 'Groups'];

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60">
        <Animated.View 
          entering={SlideInUp.duration(400)} 
          exiting={SlideOutUp.duration(300)}
          className="bg-white dark:bg-[#0f111a] p-6 pt-14 rounded-b-[40px] shadow-2xl"
          style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}
        >
          {/* Search Input */}
          <View 
            className="flex-row items-center px-4 rounded-3xl h-14"
            style={{ backgroundColor: surfaceHigh }}
          >
            <Search size={22} color={primaryColor} />
            <TextInput 
              className="flex-1 ml-3 text-lg font-bold"
              style={{ color: textColor }}
              placeholder="Search people, groups..."
              placeholderTextColor={subTextColor}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {loading ? (
              <ActivityIndicator color={primaryColor} />
            ) : query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={20} color={subTextColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} className="ml-4 p-2 bg-gray-500/10 rounded-full">
              <Text className="font-bold text-xs" style={{ color: primaryColor }}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View className="flex-row mt-6 space-x-3">
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className="px-5 py-2.5 rounded-full"
                style={{ 
                  backgroundColor: activeCategory === cat ? primaryColor : surfaceHigh 
                }}
              >
                <Text 
                  className="font-bold text-xs"
                  style={{ color: activeCategory === cat ? getContrastText(primaryColor) : subTextColor }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          className="flex-1 p-6 -mt-8"
        >
          <Animated.View 
            entering={FadeIn.delay(200)}
            className="flex-1 bg-white dark:bg-[#1A1C24] rounded-t-[40px] shadow-2xl overflow-hidden"
            style={{ backgroundColor: isDarkMode ? '#1e212d' : '#FFFFFF' }}
          >
            {query.length < 2 ? (
              <View className="flex-1 items-center justify-center p-10 opacity-30">
                <History size={64} color={subTextColor} />
                <Text className="mt-4 text-center font-bold" style={{ color: subTextColor }}>Search ChatSnap for anything</Text>
              </View>
            ) : filteredResults.length > 0 ? (
              <FlatList 
                data={filteredResults}
                keyExtractor={item => `${item.type}-${item.id}`}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => handleSelect(item)}
                    className="flex-row items-center mb-6"
                  >
                    <View className="relative">
                      {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} className="w-14 h-14 rounded-2xl" />
                      ) : (
                        <View 
                          className="w-14 h-14 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: item.type === 'user' ? primaryColor : '#AF52DE' }}
                        >
                          {item.type === 'user' ? <User size={24} color="#FFF" /> : <Users size={24} color="#FFF" />}
                        </View>
                      )}
                      <View className="absolute -right-1 -bottom-1 bg-white dark:bg-[#1A1C24] p-1 rounded-full">
                        {item.type === 'user' ? <MessageSquare size={12} color={primaryColor} /> : <Users size={12} color="#AF52DE" />}
                      </View>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-lg font-black" style={{ color: textColor }}>{item.title}</Text>
                      <Text className="text-sm font-medium" style={{ color: subTextColor }}>{item.subtitle}</Text>
                    </View>
                    <ArrowRight size={20} color={subTextColor} />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View className="flex-1 items-center justify-center p-10">
                <Text className="text-center font-bold" style={{ color: subTextColor }}>No results found for "{query}"</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default SearchOverlay;
