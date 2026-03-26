import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Phone } from 'lucide-react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import Button from '../components/ui/Button';
import Header from '../components/ui/Header';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import ScreenBackground from '../components/ui/ScreenBackground';

const RegisterScreen = () => {
    const { primaryColor } = useSelector((state: RootState) => state.theme);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayName, setDisplayName] = useState('');
    const navigation = useNavigation<any>();

    const handleNext = () => {
        if (phoneNumber.trim() && displayName.trim()) {
            navigation.navigate('OTP', { phoneNumber, displayName, isNewUser: true });
        }
    };

    return (
        <ScreenBackground>
            <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
            
            <Header title="Join ChatSnap" showBack />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
            >
                <View className="px-8 pt-10">
                    <Animated.View entering={FadeInLeft.duration(500)} className="mb-10">
                        <Text className="text-4xl font-black text-slate-900 tracking-tighter">Sign Up</Text>
                        <Text className="text-slate-500 mt-2 text-lg font-medium">Join ChatSnap today.</Text>
                    </Animated.View>
                </View>

                <View className="mt-12 space-y-6">
                    <View>
                        <Text className="text-outline text-xs font-black uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                        <View className="flex-row items-center bg-surface-container-low rounded-2xl px-5 py-4 border border-outline-variant/10">
                             <User size={20} color="#737580" />
                             <TextInput 
                                className="flex-1 ml-3 text-xl font-bold text-onSurface"
                                placeholder="Enter your name"
                                placeholderTextColor="#464752"
                                value={displayName}
                                onChangeText={setDisplayName}
                             />
                        </View>
                    </View>

                    <View className="mt-6">
                        <Text className="text-outline text-xs font-black uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                        <View className="flex-row items-center bg-surface-container-low rounded-2xl px-5 py-4 border border-outline-variant/10">
                             <Phone size={20} color="#737580" />
                             <TextInput 
                                className="flex-1 ml-3 text-xl font-bold text-onSurface"
                                placeholder="+92 300 1234567"
                                placeholderTextColor="#464752"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                             />
                        </View>
                    </View>
                </View>

                <View className="flex-1 justify-end pb-12">
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
            </KeyboardAvoidingView>
        </ScreenBackground>
    );
};

export default RegisterScreen;
