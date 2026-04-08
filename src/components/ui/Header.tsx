import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useResponsive } from '../../hooks/useResponsive';
import { isLightColor } from '../../services/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  navigation?: any;
  avatar?: string;
  isOnline?: boolean;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  title, 
  subtitle,
  showBack = false, 
  rightElement,
  transparent = false,
  navigation,
  avatar,
  isOnline
}) => {
  const insets = useSafeAreaInsets();
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet } = useResponsive();

  return (
    <View 
      style={{
        paddingTop: insets.top,
        backgroundColor: transparent ? 'transparent' : 'transparent',
        zIndex: 100,
      }}
    >
      <StatusBar 
        barStyle={isDarkMode || !isLightColor(primaryColor) ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />
      
      {!transparent && (
        <LinearGradient
          colors={isDarkMode ? ['#0f111a', '#0a0a0a'] : [primaryColor, `${primaryColor}EE`]}
          style={{
            ...StyleSheet.absoluteFillObject,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
          }}
        />
      )}

      <View 
        className={`flex-row items-center justify-between px-6 ${isTablet ? 'h-24' : 'h-[70px]'}`}
      >
        <View className="w-12">
          {(showBack && navigation) && (
            <TouchableOpacity 
              onPress={() => navigation?.goBack?.()}
              className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10 border border-white/5"
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-1 flex-row items-center px-2">
          {avatar && (
            <View className="relative mr-3">
              <View className="w-10 h-10 rounded-full bg-white/20 overflow-hidden border border-white/10">
                <RNImage source={{ uri: avatar }} className="w-full h-full" />
              </View>
              {isOnline && (
                <View 
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#10B981]" 
                  style={{ backgroundColor: '#10B981', borderColor: isDarkMode ? '#0f111a' : primaryColor }}
                />
              )}
            </View>
          )}
          <View className="flex-1">
            {title && (
              <Text
                className={`font-black tracking-[1px] ${isTablet ? 'text-2xl' : 'text-lg'}`}
                numberOfLines={1}
                style={{ color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                className="text-[9px] font-black uppercase tracking-[2px] mt-0.5 opacity-80"
                numberOfLines={1}
                style={{ color: '#FFFFFF' }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View className="min-w-[48px] flex-row items-center justify-end">
          {rightElement}
        </View>
      </View>
    </View>
  );
});

export default Header;
