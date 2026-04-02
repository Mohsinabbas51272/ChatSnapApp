import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import { ArrowLeft } from 'lucide-react-native';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import ScreenBackground from '../components/ui/ScreenBackground';

const LoginScreen = ({ navigation }: any) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('OTP', { phoneNumber, isNewUser: false, displayName: '' });
    }, 1000);
  };

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Header title="Welcome Back" showBack navigation={navigation} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
          className="pb-12"
          showsVerticalScrollIndicator={false}
        >
          <View style={getResponsiveContainerStyle()} className="px-6">
            <Animated.View 
              entering={FadeInDown.delay(200).duration(800)}
              className={`mb-12 ${isTablet ? 'items-center' : ''}`}
            >
              {/* Badge */}
              <View className="flex-row items-center self-start px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Text className="text-primary text-[10px] uppercase tracking-widest font-bold">Secure Protocol v2.0</Text>
              </View>
              
              <Text className={`${isTablet ? 'text-7xl text-center' : 'text-5xl'} font-black text-onSurface tracking-tighter`}>
                Welcome{' '}
                <Text style={{ color: primaryColor }}>Back</Text>
              </Text>
              <Text className={`text-onSurface-variant ${isTablet ? 'text-2xl text-center mt-6' : 'text-lg mt-4'} leading-relaxed max-w-[280px]`}>
                Enter your phone number to get started
              </Text>
            </Animated.View>

            <Animated.View 
              entering={FadeInUp.delay(400).duration(800)}
              className={`space-y-4 ${isTablet ? 'max-w-md self-center w-full' : ''}`}
            >
              <Input
                label="Mobile Number"
                placeholder="000 000 0000"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (error) setError('');
                }}
                error={error}
                autoFocus
              />

              <TouchableOpacity 
                  onPress={handleSendOTP}
                  disabled={phoneNumber.length < 10 || loading}
                  className="w-full py-4 rounded-2xl items-center mt-6"
                  style={{ 
                      backgroundColor: phoneNumber.length >= 10 ? primaryColor : '#f0f0f5', 
                      opacity: loading ? 0.7 : 1,
                      elevation: phoneNumber.length >= 10 ? 4 : 0,
                      shadowColor: primaryColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8
                  }}
              >
                  <Text style={{ color: phoneNumber.length >= 10 ? 'white' : '#999' }} className="text-lg font-black">
                      {loading ? 'Sending Code...' : 'Send OTP'}
                  </Text>
              </TouchableOpacity>

              <Text className="text-xs text-center text-onSurface-variant mt-10 leading-5 px-6">
                By tapping Send OTP, you agree to our <Text style={{ color: primaryColor }}>Terms</Text> and <Text style={{ color: primaryColor }}>Privacy Policy</Text>.
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

export default LoginScreen;
