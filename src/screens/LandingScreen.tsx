import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageSquare, Aperture, Sparkles, ShieldCheck } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Button from '../components/ui/Button';

import ScreenBackground from '../components/ui/ScreenBackground';

const LandingScreen = ({ navigation }: any) => {
    const { isDarkMode } = useSelector((state: RootState) => state.theme);
    const { isTablet, isSmallPhone } = useResponsive();

    return (
        <ScreenBackground>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? 'transparent' : 'white'} translucent />
            
            <View className="flex-1 items-center justify-between py-12 px-8">
                {/* Logo & Hero */}
                <Animated.View 
                    entering={FadeInDown.delay(200).duration(1000)}
                    className={`items-center ${isTablet ? 'mt-32' : 'mt-20'}`}
                >
                    {/* Brand Logo */}
                    <View className={`relative ${isTablet ? 'w-40 h-40' : 'w-28 h-28'} items-center justify-center mb-10`}>
                        <View className={`${isTablet ? 'w-36 h-36' : 'w-24 h-24'} rounded-3xl items-center justify-center`} 
                              style={{ backgroundColor: '#4963ff', shadowColor: '#4963ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 }}>
                            <View className="relative items-center justify-center">
                                <MessageSquare size={isTablet ? 72 : 44} color="white" fill="white" />
                                <View className={`absolute items-center justify-center ${isTablet ? 'w-12 h-12' : 'w-7 h-7'} rounded-full`} 
                                      style={{ backgroundColor: 'white' }}>
                                    <Aperture size={isTablet ? 28 : 18} color="#4963ff" />
                                </View>
                            </View>
                        </View>
                        <View className={`absolute ${isTablet ? '-bottom-2 -right-2 w-12 h-12' : '-bottom-1 -right-1 w-7 h-7'} rounded-full items-center justify-center`} 
                              style={{ backgroundColor: '#c500e6', elevation: 5 }}>
                            <Sparkles size={isTablet ? 20 : 12} color="white" fill="white" />
                        </View>
                    </View>

                    <Text className={`${isTablet ? 'text-7xl' : 'text-5xl'} font-black text-onSurface tracking-tighter`}>ChatSnap</Text>
                    <Text className={`text-onSurface-variant ${isTablet ? 'mt-8 text-2xl px-20' : 'mt-4 text-lg px-6'} text-center font-bold leading-6`}>
                        Real moments with real friends. Anytime, anywhere.
                    </Text>
                </Animated.View>

                {/* Actions */}
                <Animated.View 
                    entering={FadeInUp.delay(500).duration(1000)}
                    className={`w-full space-y-4 ${isTablet ? 'mb-32 px-20 max-w-sm self-center' : 'mb-20 px-4'}`}
                >
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Register')}
                        className="w-full bg-[#4963ff] py-5 rounded-[28px] items-center shadow-lg shadow-blue-100"
                        style={{ elevation: 4 }}
                    >
                        <Text className={`text-white ${isTablet ? 'text-xl' : 'text-lg'} font-black uppercase tracking-widest`}>Get Started</Text>
                    </TouchableOpacity>
 
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Login')}
                        className="w-full bg-surface-container border-2 border-outline-variant py-5 rounded-[28px] items-center mt-5"
                    >
                        <Text className={`text-onSurface ${isTablet ? 'text-xl' : 'text-lg'} font-black uppercase tracking-widest`}>Login with Phone</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </ScreenBackground>
    );
};

export default LandingScreen;
