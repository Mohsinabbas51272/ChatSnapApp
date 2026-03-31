import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import { auth, db } from '../services/firebaseConfig';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import Header from '../components/ui/Header';
import Input from '../components/ui/Input';
import { RootState } from '../store';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ScreenBackground from '../components/ui/ScreenBackground';

const OTPScreen = () => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phoneNumber, displayName, isNewUser } = route.params;
  const dispatch = useDispatch();

  const handleVerify = async () => {
    if (otp !== '112233') {
      setError('Invalid code. For now, use 112233');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already exists with this phone number
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      
      let finalUser: any = null;

      if (!querySnapshot.empty) {
        // User exists - log them in with existing data
        finalUser = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id };
        console.log('Existing user found:', finalUser.uid);
      } else {
        // New user - sign in and create document
        const userCredential = await signInAnonymously(auth);
        const authUid = userCredential.user.uid;
        const userDocRef = doc(db, 'users', authUid);
        
        finalUser = {
          uid: authUid,
          phoneNumber: phoneNumber,
          displayName: displayName || 'Anonymous User',
          photoURL: null,
          isNewUser: true,
          createdAt: new Date().toISOString(),
          status: 'online',
          lastSeen: new Date().toISOString()
        };
        
        await setDoc(userDocRef, finalUser);
        console.log('New user created:', authUid);
      }

      dispatch(setUser(finalUser));
      
      // Navigate based on user status (if they have a name and photo, go home)
      const shouldSetup = finalUser.isNewUser || !finalUser.displayName;
      navigation.replace(shouldSetup ? "ProfileSetup" : "Home");
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      <Header title="Verify Identity" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-8 py-12"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(800)} className="mb-12">
            <View className="flex-row items-center self-start px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <ShieldCheck size={16} color={primaryColor} />
              <Text className="text-primary text-[10px] uppercase tracking-widest font-bold ml-2">Hardware-Backed Security</Text>
            </View>
            
            <Text className="text-4xl font-black text-slate-900 tracking-tighter">Enter Code</Text>
            <Text className="text-slate-500 mt-2 text-lg font-medium">
              We've sent a code to{' '}
              <Text className="text-slate-900 font-bold">{phoneNumber}</Text>
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(800)} className="space-y-8">
            <View>
              <Text className="text-outline text-xs font-black uppercase tracking-widest mb-2 ml-1">6-Digit Code</Text>
              <Input
                placeholder="112233"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  if (error) setError('');
                }}
                autoFocus
                textAlign="center"
                style={{ fontSize: 32, letterSpacing: 8, fontWeight: 'bold', paddingLeft: 8, lineHeight: 40 }}
                inputContainerClassName="px-0 py-6"
                error={error}
              />
            </View>

            <TouchableOpacity 
                onPress={handleVerify}
                disabled={otp.length !== 6 || loading}
                className="w-full py-4 rounded-2xl items-center mt-6"
                style={{ 
                    backgroundColor: otp.length === 6 ? primaryColor : '#f0f0f5', 
                    opacity: loading ? 0.7 : 1,
                    elevation: otp.length === 6 ? 4 : 0,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8
                }}
            >
                <Text style={{ color: otp.length === 6 ? 'white' : '#999' }} className="text-lg font-black">
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-4 self-center">
                <Text className="text-slate-400 font-bold text-sm">Resend Code in 0:59</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

export default OTPScreen;
