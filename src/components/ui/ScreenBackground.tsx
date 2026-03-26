import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
  showWatermark?: boolean;
  showBubbles?: boolean;
}

const ScreenBackground: React.FC<ScreenBackgroundProps> = React.memo(({ 
  children, 
  showWatermark = true, 
  showBubbles = true 
}) => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const bubble1Style = useMemo(() => ({ backgroundColor: primaryColor, transform: [{ scale: 1.2 }] }), [primaryColor]);
  const bubble2Style = useMemo(() => ({ backgroundColor: '#c500e6', transform: [{ scale: 1.25 }] }), []);
  const bubble3Style = useMemo(() => ({ backgroundColor: primaryColor }), [primaryColor]);

  return (
    <View className="flex-1 bg-white">
      {children}

      {showBubbles && (
        <>
          <View 
            className="absolute top-[-10%] left-[-15%] w-[80%] h-[60%] rounded-full opacity-[0.12]" 
            style={bubble1Style} 
            pointerEvents="none" 
          />
          <View 
            className="absolute bottom-[-5%] right-[-15%] w-[80%] h-[60%] rounded-full opacity-[0.10]" 
            style={bubble2Style} 
            pointerEvents="none" 
          />
          <View 
            className="absolute top-[30%] right-[-20%] w-[50%] h-[40%] rounded-full opacity-[0.06]" 
            style={bubble3Style} 
            pointerEvents="none" 
          />
        </>
      )}

      {showWatermark && (
        <View className="absolute bottom-10 left-0 right-0 items-center justify-center opacity-30" pointerEvents="none">
          <View className="flex-row items-center">
            <ShieldCheck size={12} color="#666" />
            <Text className="text-[8px] font-black uppercase tracking-widest ml-1.5 text-slate-500">
              Hardware-Backed Encryption
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

export default ScreenBackground;
