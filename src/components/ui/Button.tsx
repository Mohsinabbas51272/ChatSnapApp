import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  titleStyle?: any;
}

const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false, 
  disabled = false,
  className = '',
  icon,
  titleStyle
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'bg-primary-dim';
      case 'secondary': return 'bg-surface-container-highest border border-outline-variant/15';
      case 'outline': return 'bg-transparent border border-outline-variant/30';
      case 'ghost': return 'bg-transparent';
      default: return 'bg-primary-dim';
    }
  };

  const getTextClass = () => {
    switch (variant) {
      case 'primary': return 'text-white font-bold';
      case 'secondary': return 'text-onSurface font-bold';
      case 'outline': return 'text-onSurface font-bold';
      case 'ghost': return 'text-primary font-medium';
      default: return 'text-white font-bold';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      className={`flex-row items-center justify-center py-4 px-6 rounded-full ${getVariantClass()} ${disabled ? 'opacity-50' : ''} ${className}`}
      style={variant === 'primary' ? {
        shadowColor: '#4963ff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
      } : undefined}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <View className="flex-row items-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text style={titleStyle} className={`text-center text-lg ${getTextClass()}`}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;
