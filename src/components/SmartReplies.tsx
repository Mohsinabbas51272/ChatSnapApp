import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface SmartRepliesProps {
  lastMessage: string;
  onSelect: (reply: string) => void;
  primaryColor: string;
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

const SmartReplies: React.FC<SmartRepliesProps> = React.memo(({ lastMessage, onSelect, primaryColor }) => {
  const suggestions = useMemo(() => getSuggestions(lastMessage), [lastMessage]);

  return (
    <View className="px-4 py-2 bg-surface-container-low/60">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {suggestions.map((reply, index) => (
          <TouchableOpacity 
            key={index}
            onPress={() => onSelect(reply)}
            className="mr-2 px-4 py-2 rounded-full bg-surface-container-highest border border-outline-variant/15"
            activeOpacity={0.7}
          >
            <Text className="text-onSurface font-bold text-sm">{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

export default SmartReplies;
