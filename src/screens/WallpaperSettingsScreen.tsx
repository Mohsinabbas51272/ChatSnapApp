import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setChatWallpaper, setWallpaperOpacity } from '../store/themeSlice';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';
import { Image as ImageIcon, Check, Trash2, GalleryVertical } from 'lucide-react-native';
import { getContrastText } from '../services/colors';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PRESET_WALLPAPERS = [
  '#F0F2FA', '#111827', '#E5E7EB', '#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#F5F3FF', '#FAE8FF'
];

const WallpaperSettingsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const { primaryColor, isDarkMode, chatWallpaper, chatWallpaperOpacity } = useSelector((state: RootState) => state.theme);
  const [tempOpacity, setTempOpacity] = useState(chatWallpaperOpacity);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });

    if (!result.canceled) {
      dispatch(setChatWallpaper({ uri: result.assets[0].uri }));
    }
  };

  const handleReset = () => {
    dispatch(setChatWallpaper({ uri: null }));
  };

  return (
    <ScreenBackground>
      <Header title="Chat Wallpaper" showBack navigation={navigation} />
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Preview Section */}
        <View className="items-center mb-8">
          <Text className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: subTextColor }}>Preview</Text>
          <View 
            className="w-full h-80 rounded-[40px] overflow-hidden border-4" 
            style={{ 
              borderColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              backgroundColor: isDarkMode ? '#000000' : '#F9FAFB' 
            }}
          >
            {chatWallpaper ? (
              <Image 
                source={{ uri: chatWallpaper }} 
                className="w-full h-full" 
                style={{ opacity: chatWallpaperOpacity }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center opacity-10">
                 <ImageIcon size={64} color={textColor} />
              </View>
            )}
            
            {/* Dummy Chat Bubbles */}
            <View className="absolute inset-0 p-6 justify-end">
              <View className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-2xl rounded-bl-sm mb-3 self-start max-w-[80%] shadow-sm">
                 <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#FFF' : '#000' }}>Hey! How do you like this wallpaper? ✨</Text>
              </View>
              <View 
                className="p-3 rounded-2xl rounded-br-sm self-end max-w-[80%] shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                 <Text className="text-xs font-black" style={{ color: getContrastText(primaryColor) }}>It looks amazing! So personalized. 😍</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Options */}
        <Text className="text-lg font-black mb-4" style={{ color: textColor }}>Customization</Text>
        
        <TouchableOpacity 
          onPress={handlePickImage}
          className="flex-row items-center p-5 rounded-3xl mb-4"
          style={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }}
        >
          <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${primaryColor}20` }}>
            <GalleryVertical size={24} color={primaryColor} />
          </View>
          <View className="flex-1">
            <Text className="font-bold" style={{ color: textColor }}>Choose from Gallery</Text>
            <Text className="text-xs" style={{ color: subTextColor }}>Use your own photo as background</Text>
          </View>
        </TouchableOpacity>

        {chatWallpaper && (
          <TouchableOpacity 
            onPress={handleReset}
            className="flex-row items-center p-5 rounded-3xl mb-8"
            style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }}
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: '#EF4444' }}>
              <Trash2 size={24} color="#FFF" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-red-500">Remove Wallpaper</Text>
              <Text className="text-xs text-red-400">Restore the default chat background</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Opacity Slider */}
        {chatWallpaper && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
               <Text className="font-bold" style={{ color: textColor }}>Wallpaper Opacity</Text>
               <Text className="font-black" style={{ color: primaryColor }}>{Math.round(chatWallpaperOpacity * 100)}%</Text>
            </View>
            <View className="px-2">
               {/* Note: In a real environment I'd use @react-native-community/slider but I'll use simple buttons if slider unavailable in standard packages unless I check package.json */}
               <View className="flex-row space-x-2">
                  {[0.1, 0.2, 0.3, 0.5, 0.7, 1.0].map(op => (
                    <TouchableOpacity 
                      key={op}
                      onPress={() => dispatch(setWallpaperOpacity(op))}
                      className="flex-1 h-12 rounded-xl items-center justify-center"
                      style={{ 
                        backgroundColor: Math.abs(chatWallpaperOpacity - op) < 0.01 ? primaryColor : (isDarkMode ? '#1F2937' : '#F3F4F6')
                      }}
                    >
                      <Text 
                        className="text-xs font-black"
                        style={{ color: Math.abs(chatWallpaperOpacity - op) < 0.01 ? getContrastText(primaryColor) : subTextColor }}
                      >
                        {op * 100}%
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Status / Tip */}
      <Animated.View 
        entering={FadeIn.delay(500)}
        className="absolute bottom-10 left-6 right-6 p-4 rounded-3xl items-center flex-row justify-center space-x-2"
        style={{ backgroundColor: isDarkMode ? '#111827EE' : '#FFFFFFEE', borderWidth: 1, borderColor: `${primaryColor}20` }}
      >
        <Check size={16} color={primaryColor} />
        <Text className="text-[10px] font-black uppercase tracking-widest" style={{ color: subTextColor }}>Settings autosaved</Text>
      </Animated.View>
    </ScreenBackground>
  );
};

export default WallpaperSettingsScreen;
