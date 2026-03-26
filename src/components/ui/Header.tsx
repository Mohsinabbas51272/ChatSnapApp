import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  title, 
  showBack = false, 
  rightElement,
  transparent = false
}) => {
  const navigation = useNavigation();
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const containerStyle = useMemo(() => ({ 
    backgroundColor: transparent ? 'transparent' : primaryColor,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  }), [transparent, primaryColor]);

  return (
    <SafeAreaView 
      edges={['top']} 
      style={containerStyle}
    >
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      <View className="flex-row items-center justify-between px-6 py-4 h-[60]">
        <View className="w-10">
          {showBack && (
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        {title && (
          <Text className="text-xl font-black text-white tracking-tight">{title}</Text>
        )}
        
        <View className="w-10 items-end">
          {rightElement}
        </View>
      </View>
    </SafeAreaView>
  );
});

export default Header;

