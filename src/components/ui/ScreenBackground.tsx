import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const { isTablet, getResponsiveContainerStyle } = useResponsive();

  const bubble1Style = useMemo(() => ({ backgroundColor: primaryColor, transform: [{ scale: 1.2 }] }), [primaryColor]);
  const bubble2Style = useMemo(() => ({ backgroundColor: '#c500e6', transform: [{ scale: 1.25 }] }), []);
  const bubble3Style = useMemo(() => ({ backgroundColor: primaryColor }), [primaryColor]);

  return (
    <View 
      style={{ 
        backgroundColor: isDarkMode ? '#000000' : '#F8F9FF',
        flex: 1 
      }}
    >
      <View style={getResponsiveContainerStyle()}>
        {children}
      </View>

      {showBubbles && (
        <>
          <View 
            className="absolute top-[-10%] left-[-15%] w-[80%] h-[60%] rounded-full opacity-[0.05]" 
            style={bubble1Style} 
            pointerEvents="none" 
          />
          <View 
            className="absolute bottom-[-5%] right-[-15%] w-[80%] h-[60%] rounded-full opacity-[0.04]" 
            style={bubble2Style} 
            pointerEvents="none" 
          />
          <View 
            className="absolute top-[30%] right-[-20%] w-[50%] h-[40%] rounded-full opacity-[0.02]" 
            style={bubble3Style} 
            pointerEvents="none" 
          />
        </>
      )}


    </View>
  );
});

export default ScreenBackground;
