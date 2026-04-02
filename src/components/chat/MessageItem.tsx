import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideInLeft, Layout } from 'react-native-reanimated';
import { Camera, Check, CheckCheck, Play, Pause, Trash } from 'lucide-react-native';
import { Audio } from 'expo-av';

const VoiceMessagePlayer = React.memo(({ uri, duration, isMe, primaryColor }: { uri: string; duration?: number; isMe: boolean; primaryColor: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playSound = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
        if (status.positionMillis) setPosition(status.positionMillis);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-row items-center py-1">
      <TouchableOpacity 
        onPress={playSound}
        className={`w-10 h-10 rounded-full items-center justify-center ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}
      >
        {isPlaying ? (
          <Pause size={18} color={isMe ? 'white' : '#9ba8ff'} fill={isMe ? 'white' : '#9ba8ff'} />
        ) : (
          <Play size={18} color={isMe ? 'white' : '#9ba8ff'} fill={isMe ? 'white' : '#9ba8ff'} />
        )}
      </TouchableOpacity>
      <View className="ml-3 flex-1">
        <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
           <View 
             className="h-full" 
             style={{ 
               width: `${(position / (duration ? duration * 1000 : 1)) * 100}%`,
               backgroundColor: isMe ? 'white' : '#9ba8ff'
             }} 
           />
        </View>
        <Text className={`text-[10px] mt-1 font-bold ${isMe ? 'text-white/80' : 'text-onSurface-variant'}`}>
          {duration ? formatTime(duration) : 'Voice Note'}
        </Text>
      </View>
    </View>
  );
});

interface MessageItemProps {
  item: any;
  isMe: boolean;
  chatPartner: any;
  onOpenSnap: (msg: any) => void;
  onLongPress: (id: string) => void;
  reactionMessageId: string | null;
  handleReaction: (msgId: string, emoji: string, currentReactions: any) => void;
  handleDeleteMessage: (msgId: string) => void;
  primaryColor: string;
  isGroup: boolean;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
  item, 
  isMe, 
  chatPartner, 
  onOpenSnap, 
  onLongPress, 
  reactionMessageId, 
  handleReaction, 
  handleDeleteMessage, 
  primaryColor, 
  isGroup 
}) => {
  const { width } = useWindowDimensions();
  const isSnap = item.type === 'snap';
  const isVoice = item.type === 'voice';
  const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;

  const partnerName = chatPartner?.displayName || chatPartner?.phoneNumber || item?.displayName || 'User';
  const partnerPhoto = chatPartner?.photoURL;

  return (
    <Animated.View 
      entering={isMe ? SlideInRight.springify().mass(0.8) : SlideInLeft.springify().mass(0.8)}
      layout={Layout.springify()}
      className={`mb-6 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && (
        <View className="w-9 h-9 rounded-full bg-surface-container-highest mr-2 items-center justify-center overflow-hidden border border-outline-variant/20">
           {partnerPhoto ? (
              <Image source={{ uri: partnerPhoto }} className="w-full h-full" />
           ) : (
               <Text className="text-xs font-bold text-onSurface">{(partnerName || '?').charAt(0).toUpperCase()}</Text>
           )}
        </View>
      )}
      <View style={{ maxWidth: width * 0.75 }}>
        <TouchableOpacity 
          onPress={() => isMe ? null : (isSnap ? onOpenSnap(item) : null)}
          onLongPress={() => onLongPress(item.id!)}
          delayLongPress={300}
          style={isMe ? {
            backgroundColor: '#4963ff',
            shadowColor: '#4963ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          } : {
            backgroundColor: '#5d8aff',
            shadowColor: '#5d8aff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          }}
          className={`px-5 py-3 rounded-2xl ${
            isMe ? 'rounded-tr-none' : 'rounded-tl-none'
          } ${isSnap && item.viewed ? 'opacity-40' : ''}`}
        >
          {item.storyReply && (
             <View className="mb-3 bg-black/10 rounded-xl overflow-hidden flex-row items-center border border-white/20" style={{ maxWidth: 200 }}>
                 <Image source={{ uri: item.storyReply.imageUri }} className="w-12 h-16 bg-surface-container" resizeMode="cover" />
                 <View className="ml-3 flex-1 pr-2 py-2">
                    <Text className="font-bold text-xs text-white" numberOfLines={1}>Replying to {item.storyReply.authorName}</Text>
                    <Text className="text-[10px] text-white/70 mt-0.5">Story</Text>
                 </View>
             </View>
          )}
          {isSnap ? (
            <View className="flex-row items-center">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${isMe ? 'bg-white/20' : 'bg-white/20'}`}>
                <Camera size={18} color={isMe ? 'white' : 'white'} />
              </View>
              <Text className={`ml-3 font-bold text-base ${isMe ? 'text-white' : 'text-white'}`}>
                {item.viewed ? 'Opened' : isMe ? 'Sent Snap' : 'Tap to View'}
              </Text>
            </View>
          ) : isVoice ? (
             <VoiceMessagePlayer 
               uri={item.text} 
               duration={item.duration} 
               isMe={isMe} 
               primaryColor={primaryColor} 
             />
          ) : (
            <View>
                {!isMe && isGroup && item.displayName && (
                  <Text className="text-[10px] font-black text-white/60 mb-0.5 uppercase tracking-widest" style={{ letterSpacing: 0.5 }}>
                    {item.displayName}
                  </Text>
                )}
                <Text className={`text-base font-medium ${isMe ? 'text-white' : 'text-white'}`}>
                {item.text}
                </Text>
                {isMe && (
                  <View className="flex-row items-center self-end mt-1 space-x-1">
                      {item.viewed ? (
                        <View className="flex-row items-center bg-white/10 px-2 py-0.5 rounded-full">
                          <CheckCheck size={12} color="#9ba8ff" strokeWidth={3} />
                          <Text className="text-[9px] text-primary ml-1 font-black uppercase tracking-tighter">Read</Text>
                        </View>
                      ) : item.received ? (
                        <View className="flex-row items-center bg-white/10 px-2 py-0.5 rounded-full">
                          <CheckCheck size={12} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                          <Text className="text-[9px] text-white/80 ml-1 font-bold uppercase tracking-tighter">Delivered</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-white/10 px-2 py-0.5 rounded-full">
                          <Check size={12} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                          <Text className="text-[9px] text-white/60 ml-1 font-bold uppercase tracking-tighter">Sent</Text>
                        </View>
                      )}
                  </View>
                )}
            </View>
          )}
          
          {reactionMessageId === item.id && (
            <View className="absolute -top-14 left-0 right-0 flex-row bg-surface-container-highest rounded-full px-3 py-2 shadow-2xl border border-outline-variant/15 z-50 justify-between items-center min-w-[240]">
              <View className="flex-row flex-1 justify-around mr-2">
                {['❤️', '😂', '🔥', '👍', '😮', '😢'].map((emoji) => (
                  <TouchableOpacity 
                    key={emoji} 
                    onPress={() => handleReaction(item.id!, emoji, item.reactions)}
                    className="p-1"
                  >
                    <Text className="text-xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isMe && (
                 <TouchableOpacity 
                  onPress={() => handleDeleteMessage(item.id!)}
                  className="p-2 bg-error-container rounded-full ml-1"
                >
                  <Trash size={18} color="#ff4d4d" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>

        {hasReactions && (
          <Animated.View 
            entering={FadeIn.duration(300).springify()}
            className={`flex-row flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            {Object.entries(item.reactions!).map(([emoji, uids]: [string, any]) => (
              <Animated.View 
                key={emoji} 
                entering={FadeIn.delay(100).springify()}
                className="bg-surface-container-highest rounded-full px-1.5 py-0.5 shadow-sm border border-outline-variant/15 mr-1 mb-1 flex-row items-center"
              >
                <Text className="text-xs">{emoji}</Text>
                {Array.isArray(uids) && uids.length > 1 && <Text className="text-[10px] ml-0.5 text-onSurface-variant font-bold">{uids.length}</Text>}
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

export default MessageItem;
