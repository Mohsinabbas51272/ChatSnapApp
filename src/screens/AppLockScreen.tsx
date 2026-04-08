import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock, Fingerprint, ShieldCheck } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getContrastText } from '../services/colors';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock }) => {
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const user = useSelector((state: RootState) => state.auth);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  useEffect(() => {
    handleUnlock();
  }, []);

  const handleUnlock = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to open ChatSnap',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        onUnlock();
      }
    } catch (error) {
      console.error('Lock Screen Auth Failed:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }]}>
      <Animated.View entering={FadeIn.duration(800)} className="items-center justify-center">
        
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          className="w-24 h-24 rounded-[30px] items-center justify-center mb-6 shadow-2xl"
          style={{ backgroundColor: primaryColor }}
        >
          <Lock size={48} color={getContrastText(primaryColor)} />
        </Animated.View>

        <Animated.Text 
          entering={FadeInDown.delay(400).springify()}
          className="text-3xl font-black tracking-tighter mb-2" 
          style={{ color: textColor }}
        >
          ChatSnap Locked
        </Animated.Text>
        
        <Animated.Text 
          entering={FadeInDown.delay(600).springify()}
          className="text-center px-12 mb-12 font-medium" 
          style={{ color: subTextColor }}
        >
          Your messages are protected by biometric security.
        </Animated.Text>

        <TouchableOpacity 
          onPress={handleUnlock}
          className="flex-row items-center px-8 py-5 rounded-3xl shadow-xl"
          style={{ backgroundColor: primaryColor }}
          activeOpacity={0.8}
        >
          <Fingerprint size={24} color={getContrastText(primaryColor)} />
          <Text className="ml-3 font-black uppercase tracking-widest text-sm" style={{ color: getContrastText(primaryColor) }}>
            Unlock App
          </Text>
        </TouchableOpacity>

      </Animated.View>

      <View className="absolute bottom-12 items-center w-full">
        <View className="flex-row items-center bg-gray-500/10 px-4 py-2 rounded-full">
          <ShieldCheck size={14} color={primaryColor} />
          <Text className="ml-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: subTextColor }}>
            End-to-End Encrypted
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});

export default AppLockScreen;
