import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import { auth, db } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, updateDoc, increment, serverTimestamp, addDoc } from 'firebase/firestore';
import Header from '../components/ui/Header';
import Input from '../components/ui/Input';
import { RootState } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ScreenBackground from '../components/ui/ScreenBackground';
import { addReferralReward } from '../services/earn';

const OTPScreen = ({ navigation, route }: any) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { phoneNumber, displayName, email, isNewUser, referralCode } = route.params;
  const dispatch = useDispatch();

  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  const startTimer = () => {
    stopTimer();
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      // 1. Generate new 6-digit code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Update Firestore 'verificationCodes'
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await setDoc(doc(db, 'verificationCodes', email.toLowerCase()), {
        code: newCode,
        expiresAt: expiresAt.toISOString(),
      });

      // 3. Send Email via EmailJS
      await sendResendEmail(email, newCode);
      
      Alert.alert("Code Resent", "A new verification code has been sent to your Gmail.");
      startTimer();
    } catch (err: any) {
      Alert.alert("Error", "Failed to resend code: " + err.message);
    } finally {
      setIsResending(false);
    }
  };

  const sendResendEmail = async (userEmail: string, verificationCode: string) => {
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
            console.warn('Resend EmailJS Failed:', errorBody);
        }
    } catch (error: any) {
        console.error('Resend Email Error:', error.message);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      // 1. Fetch real code from Firestore
      const codeDocRef = doc(db, 'verificationCodes', email.toLowerCase());
      const codeDocSnap = await getDoc(codeDocRef);

      if (!codeDocSnap.exists()) {
        setError('No verification code found. Please try again.');
        setLoading(false);
        return;
      }

      const { code: storedCode, expiresAt } = codeDocSnap.data();

      // 2. Check Expiration
      if (new Date() > new Date(expiresAt)) {
        setError('Code expired. Please request a new one.');
        setLoading(false);
        return;
      }

      // 3. Match Code
      if (otp !== storedCode) {
        setError('Invalid code. Please check your Gmail.');
        setLoading(false);
        return;
      }

      // 4. Success - Proceed with Auth
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
            email: email.toLowerCase(),
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
            email: email.toLowerCase(),
            lastLogin: new Date().toISOString(),
            status: 'online'
          };
      } else {
          // Truly New user
          finalUser = {
            uid: authUid,
            phoneNumber: phoneNumber,
            email: email.toLowerCase(),
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
      
      // Process Referral
      if (isNewUser && referralCode && referralCode.trim().length > 5) {
        addReferralReward(referralCode.trim(), displayName || 'New User');
      }
      
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[getResponsiveContainerStyle(), { flex: 1, paddingBottom: 40 }]} className="px-6">
            <Animated.View 
              entering={FadeInDown.duration(800)} 
              className={`mb-12 mt-10 ${isTablet ? 'items-center' : ''}`}
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
                <Input
                  label="6-Digit Verification Code"
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
                  style={{ 
                    fontSize: 32, 
                    letterSpacing: 8, 
                    fontWeight: 'bold', 
                    paddingLeft: 8, 
                    color: isDarkMode ? '#FFFFFF' : '#1A1C1E' 
                  }}
                  inputContainerClassName="px-0 py-4 border-2 dark:bg-black"
                  error={error}
                />
              </View>

              <View className="pt-4">
                  <TouchableOpacity 
                      onPress={handleVerify}
                      disabled={otp.length !== 6 || loading}
                      className="w-full py-5 rounded-[24px] items-center shadow-xl"
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

                  <TouchableOpacity 
                    onPress={handleResend}
                    disabled={isResending}
                    className="mt-8 self-center px-6 py-3 rounded-full"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                      <Text 
                        style={{ color: primaryColor }}
                        className="text-[10px] font-black uppercase tracking-widest"
                      >
                        {isResending ? 'Sending...' : timer > 0 ? `Resend Code (${timer}s remaining)` : 'Resend New Code'}
                      </Text>
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
