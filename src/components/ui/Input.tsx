import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  inputContainerClassName?: string;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  containerClassName = '', 
  inputContainerClassName = '',
  ...props 
}) => {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-outline text-xs font-black uppercase tracking-widest mb-2 ml-1">{label}</Text>
      )}
      <View 
        className={`bg-surface-container-low dark:bg-black rounded-2xl py-4 border ${
          error ? 'border-secondary' : 'border-outline-variant/10'
        } ${inputContainerClassName || 'px-5'}`}
      >
        <TextInput
          className="text-onSurface dark:text-white font-medium p-0"
          placeholderTextColor="#464752"
          textAlignVertical="center"
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
