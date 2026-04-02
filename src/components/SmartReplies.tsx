import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface SmartRepliesProps {
  lastMessage: string;
  onSelect: (reply: string) => void;
  primaryColor: string;
  isDarkMode: boolean;
}

const getSuggestions = (text: string): string[] => {
  const t = (text || '').toLowerCase();
  if (t.includes('how are you') || t.includes('how ya doin')) return ["I'm good!", "Pretty well, you?", "Doing great!"];
  if (t.includes('hey') || t.includes('hello') || t.includes('hi')) return ["Hey!", "Hello there", "Hi! What's up?"];
  if (t.includes('haha') || t.includes('lol') || t.includes('lmao')) return ["😂", "That's funny", "LOL"];
  if (t.includes('bye') || t.includes('goodbye')) return ["Bye!", "Talk later", "See ya!"];
  if (t.includes('thanks') || t.includes('thank you')) return ["You're welcome", "No problem!", "Anytime 😊"];
  if (t.includes('ok') || t.includes('okay')) return ["Cool", "Got it", "Sounds good"];
  
  return ["Nice!", "Cool", "Awesome"];
};

const SmartReplies: React.FC<SmartRepliesProps> = React.memo(({ lastMessage, onSelect, primaryColor, isDarkMode }) => {
  const suggestions = useMemo(() => getSuggestions(lastMessage), [lastMessage]);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const surfaceHigh = isDarkMode ? '#222532' : '#E8EAF6';

  return (
    <View className="px-4 py-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {suggestions.map((reply, index) => (
          <TouchableOpacity 
            key={index}
            onPress={() => onSelect(reply)}
            className="mr-2 px-4 py-2 rounded-full border"
            style={{ 
              backgroundColor: surfaceHigh,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
            activeOpacity={0.7}
          >
            <Text className="font-bold text-sm" style={{ color: textColor }}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

export default SmartReplies;
