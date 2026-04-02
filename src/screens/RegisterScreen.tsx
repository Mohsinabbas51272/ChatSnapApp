import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Phone } from 'lucide-react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import Button from '../components/ui/Button';
import Header from '../components/ui/Header';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';

import ScreenBackground from '../components/ui/ScreenBackground';

const RegisterScreen = ({ navigation }: any) => {
    const { primaryColor } = useSelector((state: RootState) => state.theme);
    const { isTablet } = useResponsive();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayName, setDisplayName] = useState('');

    const handleNext = () => {
        if (phoneNumber.trim() && displayName.trim()) {
            navigation.navigate('OTP', { phoneNumber, displayName, isNewUser: true });
        }
    };

    return (
        <ScreenBackground>
            <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
            
            <Header title="Join ChatSnap" showBack navigation={navigation} />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    className="flex-1 px-8"
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                >
                    <Animated.View 
                        entering={FadeInLeft.duration(500)} 
                        className={`pt-10 mb-10 ${isTablet ? 'items-center' : ''}`}
                    >
                        <Text className={`${isTablet ? 'text-7xl text-center' : 'text-4xl'} font-black text-onSurface tracking-tighter`}>Sign Up</Text>
                        <Text className={`text-onSurface-variant ${isTablet ? 'text-2xl text-center mt-6' : 'text-lg mt-2'} font-medium`}>Join ChatSnap today.</Text>
                    </Animated.View>

                    <View className={`space-y-6 ${isTablet ? 'max-w-md self-center w-full' : ''}`}>
                        <View>
                            <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                            <View className="flex-row items-center bg-surface-container-low rounded-2xl px-5 py-4">
                                <User size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface"
                                    placeholder="Enter your name"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                />
                            </View>
                        </View>

                        <View className="mt-6">
                            <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                            <View className="flex-row items-center bg-surface-container-low rounded-2xl px-5 py-4">
                                <Phone size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface"
                                    placeholder="+92 300 1234567"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 justify-end pb-8">
                        <Text className="text-onSurface-variant/40 text-[10px] text-center mb-6 leading-4 font-bold">
                            By signing up, you agree to our Terms of Service and Privacy Policy.
                        </Text>
                        <Button 
                            title="CONTINUE" 
                            onPress={handleNext}
                            disabled={!phoneNumber.trim() || !displayName.trim()}
                            variant="primary"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenBackground>
    );
};

export default RegisterScreen;
