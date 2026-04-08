import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Phone, Mail, Gift } from 'lucide-react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import Button from '../components/ui/Button';
import Header from '../components/ui/Header';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import { db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

import ScreenBackground from '../components/ui/ScreenBackground';

const RegisterScreen = ({ navigation }: any) => {
    const { primaryColor } = useSelector((state: RootState) => state.theme);
    const { isTablet } = useResponsive();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        if (phoneNumber.trim() && displayName.trim() && email.trim()) {
            setLoading(true);
            try {
                // Generate 6-digit code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                
                // Save to Firestore 'verificationCodes'
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expires in 10 mins

                await setDoc(doc(db, 'verificationCodes', email.toLowerCase()), {
                    code,
                    expiresAt: expiresAt.toISOString(),
                });

                // Trigger email sending via EmailJS API directly
                await sendVerificationEmail(email, code);

                navigation.navigate('OTP', { phoneNumber, displayName, email: email.toLowerCase(), isNewUser: true, referralCode });
            } catch (error: any) {
                alert('Connection error: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const sendVerificationEmail = async (userEmail: string, verificationCode: string) => {
        // Placeholder for EmailJS API call
        // For production: Visit EmailJS.com and plug in your IDs
        const data = {
            service_id: 'service_rqvkkuv',
            template_id: 'template_748jngx',
            user_id: 'U0m7o0zKnIl79aruS',
            template_params: {
                'to_email': userEmail,
                'user_email': userEmail,
                'email': userEmail,
                'to': userEmail,
                'recipient_email': userEmail,
                'to_name': displayName,
                'user_name': displayName,
                'otp_code': verificationCode,
                'password': verificationCode,
                'code': verificationCode,
                'message': verificationCode,
                'otp': verificationCode,
                'OTP': verificationCode,
                'passcode': verificationCode
            }
        };

        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.warn('EmailJS Sending Failed Detail:', errorBody);
                // alert('Email sending failed. Error: ' + errorBody);
            }
        } catch (error: any) {
            console.error('Email API Error:', error.message);
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
                            <View className="flex-row items-center bg-surface-container-low dark:bg-black rounded-2xl px-5 py-4">
                                <User size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface dark:text-white"
                                    placeholder="Enter your name"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                />
                            </View>
                        </View>

                        <View className="mt-6">
                            <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                            <View className="flex-row items-center bg-surface-container-low dark:bg-black rounded-2xl px-5 py-4">
                                <Phone size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface dark:text-white"
                                    placeholder="+92 300 1234567"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>
                        </View>

                        <View className="mt-6">
                            <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Email Address</Text>
                            <View className="flex-row items-center bg-surface-container-low dark:bg-black rounded-2xl px-5 py-4">
                                <Mail size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface dark:text-white"
                                    placeholder="yourname@gmail.com"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>
                        <View className="mt-6">
                            <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Referral Code (Optional)</Text>
                            <View className="flex-row items-center bg-surface-container-low dark:bg-black rounded-2xl px-5 py-4">
                                <Gift size={20} color={primaryColor} />
                                <TextInput 
                                    className="flex-1 ml-3 text-xl font-bold text-onSurface dark:text-white"
                                    placeholder="Enter Friend's Code"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    autoCapitalize="none"
                                    value={referralCode}
                                    onChangeText={setReferralCode}
                                />
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 justify-end pb-8">
                        <View className="flex-row items-center justify-center flex-wrap mb-6 px-4">
                            <Text className="text-onSurface-variant/40 text-[10px] leading-4 font-bold">
                                By signing up, you agree to our{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                                <Text className="text-[10px] leading-4 font-black" style={{ color: primaryColor }}>Terms of Service</Text>
                            </TouchableOpacity>
                            <Text className="text-onSurface-variant/40 text-[10px] leading-4 font-bold">
                                {' '}and{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                                <Text className="text-[10px] leading-4 font-black" style={{ color: primaryColor }}>Privacy Policy</Text>
                            </TouchableOpacity>
                        </View>
                        <Button 
                            title={loading ? "SENDING CODE..." : "CONTINUE"} 
                            onPress={handleNext}
                            disabled={!phoneNumber.trim() || !displayName.trim() || !email.trim() || loading}
                            variant="primary"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenBackground>
    );
};

export default RegisterScreen;
