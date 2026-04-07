import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated as RNAnimated, Easing, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { addCoins } from '../services/earn';
import { Gift, RotateCcw } from 'lucide-react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';

const REWARDS = [
  { value: 5, color: '#9ba8ff', label: '5' },
  { value: 2, color: '#737580', label: '2' },
  { value: 10, color: '#e966ff', label: '10' },
  { value: 1, color: '#1a1c1e', label: '1' },
  { value: 20, color: '#f43f5e', label: 'JACKPOT' },
  { value: 3, color: '#10B981', label: '3' },
];

const LuckySpinner = () => {
  const [spinning, setSpinning] = useState(false);
  const spinValue = useRef(new RNAnimated.Value(0)).current;
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const spin = () => {
    if (spinning || !user.uid) return;

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
        await addCoins(user.uid!, reward.value, 'Lucky Spin Reward');
        Alert.alert("Mubarak!", `Aapne ${reward.value} coins jeet liye hain! 🎉`);
      } catch (e) {
        Alert.alert("Oops", "Coins add nahi ho saky.");
      } finally {
        setSpinning(false);
        // Reset rotation but keep position visually
        // spinValue.setValue(actualRotation); 
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

  return (
    <View className="items-center py-10 bg-surface-container/30 rounded-[40px] border border-outline-variant/10 mb-6">
      <View className="relative w-[200px] h-[200px]">
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

      <TouchableOpacity 
        onPress={spin}
        disabled={spinning}
        className={`mt-10 px-12 py-4 rounded-full shadow-xl flex-row items-center ${spinning ? 'opacity-50' : ''}`}
        style={{ backgroundColor: primaryColor }}
      >
        <RotateCcw size={20} color="white" className="mr-2" />
        <Text className="text-white font-black uppercase tracking-widest">{spinning ? 'Spinning...' : 'Spin Now'}</Text>
      </TouchableOpacity>
      
      <Text className="text-onSurface-variant text-xs font-bold mt-4 uppercase tracking-tighter opacity-50">
        Win up to 20 coins every 8 hours!
      </Text>
    </View>
  );
};

export default LuckySpinner;
