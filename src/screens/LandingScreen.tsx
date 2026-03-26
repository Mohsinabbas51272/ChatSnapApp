import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageSquare, Aperture, Sparkles, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Button from '../components/ui/Button';

import ScreenBackground from '../components/ui/ScreenBackground';

const LandingScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <ScreenBackground>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            
            <View className="flex-1 items-center justify-between py-12 px-8">
                {/* Logo & Hero */}
                <Animated.View 
                    entering={FadeInDown.delay(200).duration(1000)}
                    className="items-center mt-20"
                >
                    {/* Brand Logo */}
                    <View className="relative w-28 h-28 items-center justify-center mb-10">
                        <View className="w-24 h-24 rounded-3xl items-center justify-center" 
                              style={{ backgroundColor: '#4963ff', shadowColor: '#4963ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 }}>
                            <View className="relative items-center justify-center">
                                <MessageSquare size={44} color="white" fill="white" />
                                <View className="absolute items-center justify-center w-7 h-7 rounded-full" 
                                      style={{ backgroundColor: 'white' }}>
                                    <Aperture size={18} color="#4963ff" />
                                </View>
                            </View>
                        </View>
                        <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center" 
                              style={{ backgroundColor: '#c500e6', elevation: 5 }}>
                            <Sparkles size={12} color="white" fill="white" />
                        </View>
                    </View>

                    <Text className="text-5xl font-black text-slate-900 tracking-tighter">ChatSnap</Text>
                    <Text className="text-slate-500 mt-4 text-center text-lg font-bold px-6 leading-6">
                        Real moments with real friends. Anytime, anywhere.
                    </Text>
                </Animated.View>

                {/* Actions */}
                <Animated.View 
                    entering={FadeInUp.delay(500).duration(1000)}
                    className="w-full space-y-4 mb-20 px-4"
                >
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Register')}
                        className="w-full bg-[#4963ff] py-4 rounded-2xl items-center shadow-lg shadow-blue-100"
                        style={{ elevation: 4 }}
                    >
                        <Text className="text-white text-lg font-black">Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Login')}
                        className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl items-center mt-4"
                    >
                        <Text className="text-slate-800 text-lg font-black">Login with Phone</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </ScreenBackground>
    );
};

export default LandingScreen;
