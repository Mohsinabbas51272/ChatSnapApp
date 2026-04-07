import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ShimmerPlaceholderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({ 
  width: w = '100%', 
  height: h = 20, 
  borderRadius = 8,
  style
}) => {
  const shimmerAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startShimmer = () => {
      shimmerAnimatedValue.setValue(-1);
      Animated.loop(
        Animated.timing(shimmerAnimatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    };

    startShimmer();
  }, [shimmerAnimatedValue]);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <View 
      style={[
        styles.shimmerWrapper, 
        { width: w as any, height: h as any, borderRadius }, 
        style
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerWrapper: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
});

export default ShimmerPlaceholder;
