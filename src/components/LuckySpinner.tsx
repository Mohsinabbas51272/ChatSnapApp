import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated as RNAnimated, Easing, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { addCoins } from '../services/earn';
import { Gift, RotateCcw, Clock } from 'lucide-react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';

const REWARDS = [
  { value: 5, color: '#9ba8ff', label: '5' },
  { value: 2, color: '#737580', label: '2' },
  { value: 8, color: '#e966ff', label: '8' },
  { value: 3, color: '#1a1c1e', label: '3' },
  { value: 10, color: '#f43f5e', label: 'JACKPOT' },
  { value: 5, color: '#10B981', label: '5' },
];

interface LuckySpinnerProps {
  onRewardClaimed?: () => void;
}

const LuckySpinner = ({ onRewardClaimed }: LuckySpinnerProps) => {
  const [spinning, setSpinning] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const spinValue = useRef(new RNAnimated.Value(0)).current;
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if user already spun today
  const checkSpinStatus = async () => {
    if (!user.uid) return;
    try {
      const spinRef = doc(db, 'users', user.uid, 'wallet', 'spin');
      const spinSnap = await getDoc(spinRef);
      if (spinSnap.exists()) {
        const data = spinSnap.data();
        if (data.lastSpinDate === today) {
          setAlreadySpun(true);
        } else {
          setAlreadySpun(false);
        }
      } else {
        setAlreadySpun(false);
      }
    } catch (e) {
      console.log('Error checking spin status:', e);
    }
  };

  // Check on focus
  useFocusEffect(
    useCallback(() => {
      checkSpinStatus();
    }, [user.uid, today])
  );

  // Countdown timer to midnight
  useEffect(() => {
    if (!alreadySpun) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      if (diff <= 0) {
        setAlreadySpun(false);
        setTimeLeft('');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [alreadySpun]);

  // Save spin date to Firestore
  const recordSpin = async () => {
    if (!user.uid) return;
    try {
      const spinRef = doc(db, 'users', user.uid, 'wallet', 'spin');
      await setDoc(spinRef, { lastSpinDate: today }, { merge: true });
    } catch (e) {
      console.log('Error saving spin date:', e);
    }
  };

  const spin = () => {
    if (spinning || !user.uid || alreadySpun) return;

    setSpinning(true);
    
    // Choose a random segment
    const randomRotation = Math.floor(Math.random() * 360) + 3600; // 10 full rotations minimum
    const segmentAngle = 360 / REWARDS.length;
    
    RNAnimated.timing(spinValue, {
      toValue: randomRotation,
      duration: 5000,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start(async () => {
      // Calculate which segment it landed on (Pointer is at 270 degrees)
      const actualRotation = randomRotation % 360;
      const index = Math.floor(((270 - actualRotation) + 360) % 360 / segmentAngle);
      const reward = REWARDS[index];

      try {
        const result = await addCoins(user.uid!, reward.value, 'Lucky Spin Reward');
        if (result.success) {
          await recordSpin();
          setAlreadySpun(true);
          Alert.alert("Mubarak!", `Aapne ${reward.value} coins jeet liye hain! 🎉`);
          // Notify parent to refresh wallet balance
          onRewardClaimed?.();
        } else {
          Alert.alert("Oops", result.message);
        }
      } catch (e) {
        Alert.alert("Oops", "Coins add nahi ho saky.");
      } finally {
        setSpinning(false);
      }
    });
  };

  const renderSegments = () => {
    const angle = 360 / REWARDS.length;
    return REWARDS.map((rew, i) => {
      const startAngle = i * angle;
      const endAngle = (i + 1) * angle;
      const midAngle = (startAngle + endAngle) / 2;
      
      const x1 = 105 + 100 * Math.cos((Math.PI * startAngle) / 180);
      const y1 = 105 + 100 * Math.sin((Math.PI * startAngle) / 180);
      const x2 = 105 + 100 * Math.cos((Math.PI * endAngle) / 180);
      const y2 = 105 + 100 * Math.sin((Math.PI * endAngle) / 180);

      const largeArcFlag = angle <= 180 ? 0 : 1;
      const pathData = `M 105 105 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return (
        <G key={i}>
          <Path d={pathData} fill={rew.color} />
          <SvgText
            x={105 + 70 * Math.cos((Math.PI * midAngle) / 180)}
            y={105 + 70 * Math.sin((Math.PI * midAngle) / 180)}
            fill="white"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${midAngle + 90}, ${105 + 70 * Math.cos((Math.PI * midAngle) / 180)}, ${105 + 70 * Math.sin((Math.PI * midAngle) / 180)})`}
          >
            {rew.label}
          </SvgText>
        </G>
      );
    });
  };

  const buttonDisabled = spinning || alreadySpun;

  return (
    <View className="items-center py-10 bg-surface-container/30 rounded-[40px] border border-outline-variant/10 mb-6">
      {/* Wheel */}
      <View className={`relative w-[200px] h-[200px] ${alreadySpun ? 'opacity-40' : ''}`}>
        {/* Pointer */}
        <View className="absolute -top-4 left-[90px] z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-rose-500" />
        
        <RNAnimated.View style={{ transform: [{ rotate: spinValue.interpolate({ inputRange: [0, 3600], outputRange: ['0deg', '3600deg'] }) }] }}>
          <Svg width="200" height="200" viewBox="0 0 210 210">
            <Circle cx="105" cy="105" r="100" fill="white" stroke={primaryColor} strokeWidth="4" />
            {renderSegments()}
            <Circle cx="105" cy="105" r="15" fill="white" stroke={primaryColor} strokeWidth="3" />
          </Svg>
        </RNAnimated.View>
      </View>

      {/* Spin Button or Cooldown */}
      {alreadySpun ? (
        <View className="mt-10 items-center">
          <View 
            className="px-12 py-4 rounded-full flex-row items-center opacity-60"
            style={{ backgroundColor: isDarkMode ? '#333' : '#ccc' }}
          >
            <Clock size={20} color={isDarkMode ? '#aaa' : '#666'} />
            <Text className="font-black uppercase tracking-widest ml-2" style={{ color: isDarkMode ? '#aaa' : '#666' }}>
              Come Back Tomorrow
            </Text>
          </View>
          {timeLeft ? (
            <Text className="text-sm font-bold mt-3" style={{ color: primaryColor }}>
              ⏳ Next spin in {timeLeft}
            </Text>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity 
          onPress={spin}
          disabled={buttonDisabled}
          className={`mt-10 px-12 py-4 rounded-full shadow-xl flex-row items-center ${spinning ? 'opacity-50' : ''}`}
          style={{ backgroundColor: primaryColor }}
        >
          <RotateCcw size={20} color="white" className="mr-2" />
          <Text className="text-white font-black uppercase tracking-widest">{spinning ? 'Spinning...' : 'Spin Now'}</Text>
        </TouchableOpacity>
      )}
      
      <Text className="text-onSurface-variant text-xs font-bold mt-4 uppercase tracking-tighter opacity-50">
        One free spin every day!
      </Text>
    </View>
  );
};

export default LuckySpinner;
