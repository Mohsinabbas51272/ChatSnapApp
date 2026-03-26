import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MessageSquare, Aperture, Sparkles, ShieldCheck } from 'lucide-react-native';
import Animated, { 
    FadeIn,
    withTiming, 
    useSharedValue, 
    useAnimatedStyle,
    Easing,
} from 'react-native-reanimated';

const SplashScreen = () => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(100, { duration: 2000, easing: Easing.inOut(Easing.ease) });
    }, []);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value}%`,
    }));

    return (
        <View className="flex-1 bg-white justify-center items-center relative overflow-hidden">
            {/* Soft Background Glows */}
            <View className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-10" style={{ backgroundColor: '#4963ff', transform: [{ scale: 1.5 }] }} />
            <View className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10" style={{ backgroundColor: '#c500e6', transform: [{ scale: 1.5 }] }} />

            {/* Central Identity */}
            <Animated.View entering={FadeIn.duration(800)} className="z-10 items-center justify-center flex-col">
                {/* Logo */}
                <View className="relative w-28 h-28 items-center justify-center mb-6">
                    <View className="w-24 h-24 rounded-3xl items-center justify-center" 
                          style={{ backgroundColor: '#4963ff', shadowColor: '#4963ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
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

                {/* Brand Text */}
                <Text className="font-extrabold text-5xl tracking-tighter" style={{ color: '#1A1C1E' }}>
                    ChatSnap
                </Text>
                <Text className="text-xs uppercase font-bold mt-2 tracking-[4px]" style={{ color: '#9ba8ff' }}>
                    Share Your Moments
                </Text>
            </Animated.View>

            {/* Progress Bar */}
            <View className="absolute bottom-20 items-center w-full px-12">
                <View className="w-full max-w-[200px] h-[4px] rounded-full overflow-hidden relative mb-4" style={{ backgroundColor: '#f0f0f5' }}>
                    <Animated.View className="absolute top-0 left-0 h-full rounded-full" style={[progressStyle, { backgroundColor: '#4963ff' }]} />
                </View>
                <Text className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#999' }}>
                    Loading
                </Text>
            </View>

            {/* Footer */}
            <View className="absolute bottom-8 flex-row items-center justify-center opacity-30">
                <ShieldCheck size={12} color="#666" />
                <Text className="text-[9px] font-bold uppercase tracking-widest ml-1.5" style={{ color: '#666' }}>
                    Encrypted Messaging
                </Text>
            </View>
        </View>
    );
};

export default SplashScreen;

