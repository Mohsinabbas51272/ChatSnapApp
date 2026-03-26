import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  containerClassName = '', 
  ...props 
}) => {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-outline text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">{label}</Text>
      )}
      <View 
        className={`bg-surface-container-low rounded-2xl px-5 py-4 border ${
          error ? 'border-secondary' : 'border-outline-variant/10'
        }`}
      >
        <TextInput
          className="text-onSurface text-base font-medium"
          placeholderTextColor="#464752"
          {...props}
        />
      </View>
      {error && (
        <Text className="text-secondary text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
};

export default Input;
