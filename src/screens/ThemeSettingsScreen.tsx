import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setMood, setTheme, toggleDarkMode } from '../store/themeSlice';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';
import { Moon, Sun, Palette, Sparkles, CheckCircle2, Circle } from 'lucide-react-native';
import { getContrastText } from '../services/colors';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', 
  '#BB8FCE', '#82E0AA', '#7FB3D5', '#F1948A', '#F9E79F', '#EBEDEF'
];

const MOODS = [
  { id: 'Chill', icon: Moon, desc: 'Soft & Mellow' },
  { id: 'Happy', icon: Sparkles, desc: 'Vibrant & Energetic' },
  { id: 'Love', icon: Palette, desc: 'Warm & Romantic' },
  { id: 'Zen', icon: Sun, desc: 'Clean & Minimal' },
  { id: 'Deep', icon: Moon, desc: 'Bold & Creative' },
  { id: 'Fire', icon: Sparkles, desc: 'Powerful & Sharp' }
];

const ThemeSettingsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const { primaryColor, themeName, isDarkMode, mood } = useSelector((state: RootState) => state.theme);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF';

  return (
    <ScreenBackground>
      <Header title="App Theme" showBack navigation={navigation} />
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        
        {/* Appearance Mode */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: subTextColor }}>Appearance</Text>
          <View className="flex-row space-x-4 mb-10">
            <TouchableOpacity 
              onPress={() => !isDarkMode && dispatch(toggleDarkMode())}
              className="flex-1 p-5 rounded-[32px] items-center justify-center border-2"
              style={{ 
                backgroundColor: isDarkMode ? primaryColor : 'transparent',
                borderColor: isDarkMode ? 'transparent' : (isDarkMode ? '#374151' : '#E5E7EB')
              }}
            >
              <Moon size={24} color={isDarkMode ? getContrastText(primaryColor) : textColor} />
              <Text className="font-black mt-2 text-xs" style={{ color: isDarkMode ? getContrastText(primaryColor) : textColor }}>DARK</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => isDarkMode && dispatch(toggleDarkMode())}
              className="flex-1 p-5 rounded-[32px] items-center justify-center border-2"
              style={{ 
                backgroundColor: !isDarkMode ? primaryColor : 'transparent',
                borderColor: !isDarkMode ? 'transparent' : (isDarkMode ? '#374151' : '#E5E7EB')
              }}
            >
              <Sun size={24} color={!isDarkMode ? getContrastText(primaryColor) : textColor} />
              <Text className="font-black mt-2 text-xs" style={{ color: !isDarkMode ? getContrastText(primaryColor) : textColor }}>LIGHT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Current Theme Preview */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-10">
           <Text className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: subTextColor }}>Current Palette</Text>
           <View className="p-6 rounded-[40px] shadow-sm flex-row items-center" style={{ backgroundColor: cardBg }}>
              <View className="w-14 h-14 rounded-[20px] items-center justify-center mr-4 shadow-lg shadow-black/20" style={{ backgroundColor: primaryColor }}>
                 <Palette size={24} color={getContrastText(primaryColor)} />
              </View>
              <View className="flex-1">
                 <Text className="font-black text-lg" style={{ color: textColor }}>{themeName}</Text>
                 <Text className="text-xs" style={{ color: subTextColor }}>Current Mood: {mood}</Text>
              </View>
              <CheckCircle2 size={24} color={primaryColor} />
           </View>
        </Animated.View>

        {/* Mood Presets */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} className="mb-10">
          <Text className="text-[10px] font-black uppercase tracking-widest mb-6" style={{ color: subTextColor }}>Mood Selection</Text>
          <View className="flex-row flex-wrap justify-between">
            {MOODS.map((m, idx) => (
              <TouchableOpacity 
                key={m.id}
                onPress={() => dispatch(setMood(m.id))}
                className="w-[48%] p-5 rounded-[32px] mb-4 items-center justify-center border"
                style={{ 
                   backgroundColor: mood === m.id ? `${primaryColor}10` : 'transparent',
                   borderColor: mood === m.id ? primaryColor : (isDarkMode ? '#374151' : '#E5E7EB')
                }}
              >
                <m.icon size={20} color={mood === m.id ? primaryColor : subTextColor} />
                <Text className="font-black mt-2" style={{ color: mood === m.id ? primaryColor : textColor }}>{m.id}</Text>
                <Text className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: subTextColor }}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Custom Colors */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)}>
          <Text className="text-[10px] font-black uppercase tracking-widest mb-6" style={{ color: subTextColor }}>Custom Accents</Text>
          <View className="flex-row flex-wrap justify-between">
             {PRESET_COLORS.map(color => (
                <TouchableOpacity 
                  key={color}
                  onPress={() => dispatch(setTheme({ primaryColor: color, themeName: 'Custom Accent' }))}
                  className="w-[23%] aspect-square mb-4 rounded-[20px] items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {primaryColor === color ? (
                    <CheckCircle2 size={24} color={getContrastText(color)} />
                  ) : null}
                </TouchableOpacity>
             ))}
          </View>
        </Animated.View>

      </ScrollView>
    </ScreenBackground>
  );
};

export default ThemeSettingsScreen;
