import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
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
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  title, 
  subtitle,
  showBack = false, 
  rightElement,
  transparent = false,
  navigation
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

        <View className="flex-1 items-center justify-center px-2">
          {title && (
            <Text
              className={`font-black tracking-[1px] text-center ${isTablet ? 'text-3xl' : 'text-xl'}`}
              numberOfLines={1}
              style={{ color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              className="text-[10px] font-black uppercase tracking-[3px] mt-1 opacity-80"
              numberOfLines={1}
              style={{ color: '#FFFFFF' }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View className="min-w-[48px] flex-row items-center justify-end">
          {rightElement}
        </View>
      </View>
    </View>
  );
});

export default Header;
