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
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { setUser } from '../store/authSlice';

import ScreenBackground from '../components/ui/ScreenBackground';

const LoginScreen = ({ navigation }: any) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 1. Check if user exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No account found! Please sign up first.');
        setLoading(false);
        return;
      }

      // Existing user found! Log them in instantly
      const plainPhone = phoneNumber.replace(/\D/g, '');
      const syntheticEmail = `${plainPhone}@chatsnap.local`;
      const syntheticPassword = `AppSec#${plainPhone}!`;

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') {
           // Edge case: Firestore doc exists, but Auth user missing? Recreate them.
           userCredential = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
        } else {
           throw e;
        }
      }

      const authUid = userCredential.user.uid;
      const userDocRef = doc(db, 'users', authUid);
      const userDocSnap = await getDoc(userDocRef);

      let finalUser: any = null;
      if (userDocSnap.exists()) {
          finalUser = { ...userDocSnap.data(), uid: authUid, lastLogin: new Date().toISOString(), status: 'online' };
      } else {
          // Fallback if looking up by doc fails but snapshot exists
          const existingDoc = querySnapshot.docs[0];
          finalUser = { ...existingDoc.data(), uid: authUid, lastLogin: new Date().toISOString(), status: 'online' };
      }

      await setDoc(userDocRef, finalUser, { merge: true });
      dispatch(setUser(finalUser));

    } catch (err: any) {
      console.error('Fast Login Error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
                  onPress={handleLogin}
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
                      {loading ? 'Authenticating...' : 'Login instantly'}
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
