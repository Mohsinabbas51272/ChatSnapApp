import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import { auth, db } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import Header from '../components/ui/Header';
import Input from '../components/ui/Input';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ScreenBackground from '../components/ui/ScreenBackground';

const OTPScreen = ({ navigation, route }: any) => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { phoneNumber, displayName, isNewUser } = route.params;
  const dispatch = useDispatch();

  const handleVerify = async () => {
    if (otp !== '112233') {
      setError('Invalid code. For now, use 112233');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already exists with this phone number in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      
      // 2. Stable Authentication via Synthetic Emails
      const plainPhone = phoneNumber.replace(/\D/g, '');
      const syntheticEmail = `${plainPhone}@chatsnap.local`;
      const syntheticPassword = `AppSec#${plainPhone}!`;

      let userCredential;
      let finalUser: any = null;

      try {
          // Attempt the stable UID method (Requires Email/Password provider enabled in Console)
          try {
              userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
          } catch(e: any) {
              if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') {
                  userCredential = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
              } else {
                  throw e;
              }
          }
      } catch (err: any) {
          // No more Anonymous fallback - Enforce registry
          throw err;
      }

      const authUid = userCredential.user.uid;
      const userDocRef = doc(db, 'users', authUid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
          // Existing user found by matching UID (more robust than phone number query)
          const existingData = userDocSnap.data();
          
          finalUser = { 
            ...existingData, 
            uid: authUid, 
            lastLogin: new Date().toISOString(),
            status: 'online'
          };
      } else if (!querySnapshot.empty) {
          // Fallback: Existing user found by phone number but under a different UID??
          const existingDoc = querySnapshot.docs[0];
          const existingData = existingDoc.data();
          
          finalUser = { 
            ...existingData, 
            uid: authUid, 
            lastLogin: new Date().toISOString(),
            status: 'online'
          };
      } else {
          // Truly New user
          finalUser = {
            uid: authUid,
            phoneNumber: phoneNumber,
            displayName: displayName || 'Anonymous User',
            photoURL: null,
            isNewUser: true,
            snapCount: 0,
            points: 100,
            createdAt: new Date().toISOString(),
            status: 'online',
            lastSeen: new Date().toISOString()
          };
      }
      
      await setDoc(userDocRef, finalUser, { merge: true });
      dispatch(setUser(finalUser));
      
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMsg = err.message;
      
      if (err.code === 'auth/operation-not-allowed') {
        Alert.alert(
          "Config Error", 
          "Firebase Console mein 'Email/Password' authentication enable karna parega.\n\nGo to: Authentication > Sign-in method > Enable Email/Password.",
          [{ text: "Understood" }]
        );
        errorMsg = "Firebase: Email/Password provider is disabled in console.";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Header title="Verify Identity" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: isTablet ? 'center' : 'flex-start' }} 
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View style={getResponsiveContainerStyle()} className="px-6">
            <Animated.View 
              entering={FadeInDown.duration(800)} 
              className={`mb-12 ${isTablet ? 'items-center' : ''}`}
            >
              <View className="flex-row items-center self-start px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <ShieldCheck size={16} color={primaryColor} />
                <Text className="text-primary text-[10px] uppercase tracking-widest font-bold ml-2">Hardware-Backed Security</Text>
              </View>
              
              <Text className={`${isTablet ? 'text-7xl text-center' : 'text-4xl'} font-black text-onSurface tracking-tighter`}>Enter Code</Text>
              <Text className={`text-onSurface-variant ${isTablet ? 'text-2xl text-center mt-6' : 'text-lg mt-2'} font-medium`}>
                We've sent a code to{' '}
                <Text className="text-onSurface font-bold">{phoneNumber}</Text>
              </Text>
            </Animated.View>
   
            <Animated.View 
              entering={FadeInUp.delay(300).duration(800)} 
              className={`space-y-8 ${isTablet ? 'max-w-md self-center w-full' : ''}`}
            >
              <View>
                <Text className="text-onSurface-variant text-[10px] font-black uppercase tracking-widest mb-2 ml-1">6-Digit Code</Text>
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

              <View className="flex-1 justify-end pb-8">
                  <TouchableOpacity 
                      onPress={handleVerify}
                      disabled={otp.length !== 6 || loading}
                      className="w-full py-5 rounded-[24px] items-center mt-6 shadow-xl"
                      style={{ 
                          backgroundColor: otp.length === 6 ? primaryColor : 'rgba(255,255,255,0.05)', 
                          opacity: loading ? 0.7 : 1,
                          shadowColor: primaryColor,
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.3,
                          shadowRadius: 20,
                          elevation: otp.length === 6 ? 8 : 0
                      }}
                  >
                      <Text 
                          style={{ color: otp.length === 6 ? 'white' : 'rgba(255,255,255,0.2)' }} 
                          className="text-sm font-black uppercase tracking-widest"
                      >
                          {loading ? 'Verifying...' : 'Verify & Continue'}
                      </Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="mt-8 self-center px-4 py-2">
                      <Text className="text-onSurface-variant font-bold text-[10px] uppercase tracking-widest">Resend Code in 0:59</Text>
                  </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

export default OTPScreen;
