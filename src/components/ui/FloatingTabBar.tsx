import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, CircleDashed, Users, Gift, Settings as SettingsIcon } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, Layout, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { isLightColor, getContrastText } from '../../services/colors';

const { width } = Dimensions.get('window');

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  
  const bgColor = isDarkMode ? 'rgba(15, 17, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.05)';
  const contrastText = getContrastText(primaryColor);

  const getIcon = (name: string, focused: boolean) => {
    const size = 22;
    const color = focused ? (isDarkMode ? '#FFFFFF' : primaryColor) : (isDarkMode ? '#737580' : '#8E8E93');
    const fill = focused && isDarkMode ? '#FFFFFF' : 'transparent';
    
    switch (name) {
      case 'Chats': return <MessageCircle size={size} color={color} fill={fill} />;
      case 'Stories': return <CircleDashed size={size} color={color} />;
      case 'Contacts': return <Users size={size} color={color} fill={fill} />;
      case 'Earn': return <Gift size={size} color={color} />;
      case 'Settings': return <SettingsIcon size={size} color={color} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { bottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
      <View style={[styles.wrapper, { backgroundColor: bgColor, borderColor }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Animated.View 
                layout={Layout.springify()}
                style={[
                  styles.iconContainer,
                  isFocused && { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${primaryColor}15`,
                    transform: [{ scale: 1.1 }]
                  }
                ]}
              >
                {getIcon(route.name, isFocused)}
                {isFocused && (
                  <Animated.View 
                    entering={FadeIn} 
                    style={[styles.indicator, { backgroundColor: primaryColor }]} 
                  />
                )}
              </Animated.View>
              {isFocused && (
                 <Text 
                  style={[
                    styles.label, 
                    { color: isDarkMode ? '#FFFFFF' : primaryColor }
                  ]}
                >
                  {route.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  wrapper: {
    flexDirection: 'row',
    width: '92%',
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -4,
  }
});

export default FloatingTabBar;
