import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';


import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useResponsive } from '../../hooks/useResponsive';
import { isLightColor, getContrastText } from '../../services/colors';

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

  const containerStyle = useMemo(() => ({ 
    backgroundColor: transparent ? 'transparent' : (isDarkMode ? '#000000' : primaryColor),
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: insets.top,
    minHeight: 60 + insets.top,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'),
    shadowColor: isDarkMode ? primaryColor : (isLightColor(primaryColor) ? '#000' : primaryColor),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.3 : (isLightColor(primaryColor) ? 0.08 : 0.2),
    shadowRadius: 16,
    elevation: 8,
  }), [transparent, primaryColor, isDarkMode, insets.top]);

  const textColor = isDarkMode ? '#FFFFFF' : getContrastText(primaryColor);
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)');
  const iconBg = isDarkMode ? 'rgba(255,255,255,0.1)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)');

  return (
    <View 
      style={containerStyle}
    >
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />
      <View 
        className={`flex-row items-center justify-between px-4 py-4 ${isTablet ? 'h-24' : 'h-[60px]'}`}
      >
        <View className="w-10">
          {(showBack && navigation) && (
            <TouchableOpacity 
              onPress={() => navigation?.goBack?.()}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: iconBg }}
            >
              <ChevronLeft size={24} color={textColor} />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-1 items-center justify-center px-4">
          {title && (
            <Text
              className={`font-black tracking-tight ${isTablet ? 'text-3xl' : subtitle ? 'text-lg' : 'text-xl'}`}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ maxWidth: '100%', color: textColor }}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              className="text-[11px] font-bold uppercase tracking-widest mt-[-2px]"
              numberOfLines={1}
              style={{ color: subTextColor }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View className="min-w-[70px] flex-row items-center justify-end">
          {rightElement}
        </View>
      </View>
    </View>
  );
});

export default Header;

