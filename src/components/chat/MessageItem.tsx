import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeIn, SlideInRight, SlideInLeft, Layout } from 'react-native-reanimated';
import { Camera, Check, CheckCheck, Play, Pause, Trash, FileText, MapPin, BarChart3, Forward } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Swipeable } from 'react-native-gesture-handler';
import { isLightColor, getContrastText } from '../../services/colors';

const VoiceMessagePlayer = React.memo(({ uri, duration, isMe, primaryColor, isDarkMode }: { uri: string; duration?: number; isMe: boolean; primaryColor: string; isDarkMode: boolean }) => {
  const player = useAudioPlayer(uri);
  
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';
  const textColor = isMe ? getContrastText(primaryColor) : (isDarkMode ? '#FFFFFF' : '#1a1c1e');
  const iconColor = isMe ? getContrastText(primaryColor) : (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor);

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-row items-center py-1">
      <TouchableOpacity 
        onPress={togglePlayback}
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }}
      >
        {player.playing ? (
          <Pause size={18} color={iconColor} fill={iconColor} />
        ) : (
          <Play size={18} color={iconColor} fill={iconColor} />
        )}
      </TouchableOpacity>
      <View className="ml-3 flex-1">
        <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }}>
           <View 
             className="h-full" 
             style={{ 
               width: `${(player.currentTime / (player.duration || 1)) * 100}%`,
               backgroundColor: isMe ? getContrastText(primaryColor) : (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor)
             }} 
           />
        </View>
        <Text className="text-[10px] mt-1 font-bold" style={{ color: textColor, opacity: 0.7 }}>
          {player.duration ? formatTime(player.duration) : (duration ? formatTime(duration * 1000) : 'Voice Note')}
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
  onReply?: (msg: any) => void;
  reactionMessageId: string | null;
  handleReaction: (msgId: string, emoji: string, currentReactions: any) => void;
  handleDeleteMessage: (id: string) => void;
  primaryColor: string;
  isGroup: boolean;
  isDarkMode: boolean;
  onPressMedia?: (item: any) => void;
  onVote?: (messageId: string, optionIndex: number) => void;
  searchQuery?: string;
  onForward?: (id: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
  item, 
  isMe, 
  chatPartner, 
  onOpenSnap, 
  onLongPress, 
  onReply,
  reactionMessageId, 
  handleReaction, 
  handleDeleteMessage, 
  primaryColor, 
  isGroup,
  isDarkMode,
  onPressMedia,
  onVote,
  searchQuery,
  onForward
}) => {
  const { width } = useWindowDimensions();
  const isSnap = item.type === 'snap';
  const isVoice = item.type === 'voice';
  const isImage = item.type === 'image';
  const isDocument = item.type === 'document';
  const isLocation = item.type === 'location';
  const isPoll = item.type === 'poll';
  const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;

  const partnerName = chatPartner?.displayName || chatPartner?.phoneNumber || item?.displayName || 'User';
  const partnerPhoto = chatPartner?.photoURL;

  const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';
  const textColor = isMe ? getContrastText(primaryColor) : (isDarkMode ? '#FFFFFF' : '#1a1c1e');
  const subTextColor = isMe ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)') : (isDarkMode ? '#FFFFFF' : 'rgba(0,0,0,0.5)');

  return (
    <Animated.View 
      entering={isMe ? SlideInRight.springify().mass(0.8) : SlideInLeft.springify().mass(0.8)}
      layout={Layout.springify()}
      className={`mb-6 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
      style={{ zIndex: reactionMessageId === item.id ? 999 : 1, elevation: reactionMessageId === item.id ? 999 : 1 }}
    >
      {!isMe && (
        <View 
          className="w-9 h-9 rounded-full mr-2 items-center justify-center overflow-hidden border"
          style={{ 
            backgroundColor: surfaceHigh,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}
        >
           {partnerPhoto ? (
              <Image source={{ uri: partnerPhoto }} className="w-full h-full" />
           ) : (
                <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#FFFFFF' : (isLightColor(primaryColor) ? '#000000' : primaryColor) }}>
                  {(partnerName || '?').charAt(0).toUpperCase()}
                </Text>
           )}
        </View>
      )}
      <View style={{ maxWidth: width * 0.75 }}>
        <Swipeable
          containerStyle={{ overflow: 'visible' }}
          childrenContainerStyle={{ overflow: 'visible' }}
          renderLeftActions={() => <View style={{ width: 1 }} />} // Dummy for swipe trigger
          onSwipeableOpen={(direction) => {
            if (direction === 'left' && onReply && !item.isDeleted) {
              onReply(item);
            }
          }}
          friction={2}
          rightThreshold={40} 
          leftThreshold={40}
        >
          <TouchableOpacity 
            onPress={() => {
              if (item.isDeleted) return;
              if (isSnap && !isMe) {
                onOpenSnap(item);
              } else if (isImage || isDocument) {
                onPressMedia?.(item);
              } else if (isLocation && item.location) {
                const { latitude, longitude } = item.location;
                const url = Platform.select({
                  ios: `maps:0,0?q=${latitude},${longitude}`,
                  android: `geo:0,0?q=${latitude},${longitude}`,
                }) || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                Linking.openURL(url);
              }
            }}
            onLongPress={() => {
              if (!item.isDeleted) onLongPress(item.id!);
            }}
            delayLongPress={300}
            disabled={item.isDeleted}
            style={isMe ? {
              backgroundColor: primaryColor,
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 4,
            } : {
              backgroundColor: surfaceLow,
              shadowColor: 'rgba(0,0,0,0.1)',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 2,
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
            className={`px-5 py-3 rounded-2xl ${
              isMe ? 'rounded-tr-none' : 'rounded-tl-none'
            } ${isSnap && item.viewed ? 'opacity-40' : ''}`}
          >
            {item.replyTo && (
              <View 
                className="mb-2 p-3 rounded-xl border-l-4" 
                style={{ 
                  backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderLeftColor: isMe ? '#FFFFFF' : primaryColor
                }}
              >
                <Text style={{ color: isMe ? '#FFFFFF' : primaryColor, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {item.replyTo.senderName}
                </Text>
                <Text numberOfLines={1} style={{ color: textColor, fontSize: 13, opacity: 0.8 }}>
                  {item.replyTo.text}
                </Text>
              </View>
            )}
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
             <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: isMe ? (isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') : (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor) }}>
                <Camera size={18} color={isMe ? getContrastText(primaryColor) : 'white'} />
              </View>
              <Text className="ml-3 font-bold text-base" style={{ color: isMe ? 'white' : textColor }}>
                {item.viewed ? 'Opened' : isMe ? 'Sent Snap' : 'Tap to View'}
              </Text>
            </View>
          ) : isVoice ? (
             <VoiceMessagePlayer 
               uri={item.text} 
               duration={item.duration} 
               isMe={isMe} 
               primaryColor={primaryColor} 
               isDarkMode={isDarkMode}
             />
          ) : isImage ? (
             <View className="flex-row items-center">
               <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }}>
                 <Camera size={18} color={isMe ? getContrastText(primaryColor) : (isLightColor(primaryColor) && !isDarkMode ? '#000000' : primaryColor)} />
               </View>
               <Text className="ml-3 font-bold text-base" style={{ color: textColor }}>
                 {isMe ? 'Sent Photo' : 'Photo • Tap to View'}
               </Text>
             </View>
          ) : isDocument ? (
             <View className="flex-row items-center">
               <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}>
                 <FileText size={18} color={textColor} />
               </View>
               <Text className="ml-3 font-bold text-base" style={{ color: textColor }}>
                 {isMe ? 'Sent Document' : 'Document • Tap to View'}
               </Text>
             </View>
          ) : isLocation ? (
             <View className="w-[200px]">
                <View className="h-32 mb-2 rounded-xl overflow-hidden border border-white/10">
                   <MapView
                     provider={PROVIDER_GOOGLE}
                     liteMode={true}
                     initialRegion={{
                       latitude: item.location?.latitude || 0,
                       longitude: item.location?.longitude || 0,
                       latitudeDelta: 0.01,
                       longitudeDelta: 0.01,
                     }}
                     style={{ width: '100%', height: '100%' }}
                     pointerEvents="none"
                   >
                     <Marker 
                       coordinate={{ 
                         latitude: item.location?.latitude || 0, 
                         longitude: item.location?.longitude || 0 
                       }} 
                     />
                   </MapView>
                </View>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}>
                    <MapPin size={14} color={isMe ? 'white' : textColor} />
                  </View>
                  <Text className="ml-2 font-black text-[12px] uppercase tracking-tighter" style={{ color: isMe ? 'white' : textColor }}>
                    {isMe ? 'My Location' : `${partnerName}'s Location`}
                  </Text>
                </View>
             </View>
          ) : isPoll ? (
             <View className="w-full">
               <View className="flex-row items-center mb-3">
                 <BarChart3 size={18} color={textColor} />
                 <Text className="ml-2 font-black text-xs uppercase tracking-widest" style={{ color: subTextColor }}>Live Poll</Text>
               </View>
               <Text className="text-lg font-black mb-4 tracking-tight" style={{ color: textColor }}>{item.poll?.question}</Text>
               <View className="space-y-2">
                 {item.poll?.options.map((option: string, index: number) => {
                   const totalVotes = Object.keys(item.poll?.votes || {}).length;
                   const votesForThis = Object.values(item.poll?.votes || {}).filter(v => v === index).length;
                   const percentage = totalVotes > 0 ? Math.round((votesForThis / totalVotes) * 100) : 0;
                   const hasVoted = item.poll?.votes?.[chatPartner?.uid === item.senderId ? (isMe ? 'me' : 'them') : 'placeholder'] !== undefined; // simplified for UI

                   return (
                     <TouchableOpacity 
                       key={index} 
                       onPress={() => onVote?.(item.id!, index)}
                       className="rounded-xl p-3 relative overflow-hidden mb-2"
                       style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                     >
                       <View 
                         className="absolute left-0 top-0 bottom-0 opacity-20" 
                         style={{ width: `${percentage}%`, backgroundColor: textColor }} 
                       />
                       <View className="flex-row justify-between items-center px-1">
                         <Text className="font-bold flex-1" style={{ color: textColor }}>{option}</Text>
                         <Text className="text-xs font-black" style={{ color: textColor }}>{percentage}%</Text>
                       </View>
                     </TouchableOpacity>
                   );
                 })}
               </View>
               <Text className="text-[9px] font-black uppercase mt-2 text-center opacity-40" style={{ color: textColor }}>
                 {Object.keys(item.poll?.votes || {}).length} Total Votes
               </Text>
             </View>
          ) : (
            <View>
                {!isMe && isGroup && item.displayName && (
                  <Text className="text-[10px] font-black mb-0.5 uppercase tracking-widest" style={{ letterSpacing: 0.5, color: isDarkMode ? 'rgba(255,255,255,0.6)' : primaryColor }}>
                    {item.displayName}
                  </Text>
                )}
                <Text className={`text-base ${item.isDeleted ? 'italic opacity-60' : 'font-medium'}`} style={{ color: textColor }}>
                {searchQuery && !item.isDeleted ? (
                  item.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) => 
                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                      <Text key={i} style={{ backgroundColor: isDarkMode ? 'rgba(255,255,0,0.3)' : 'rgba(255,255,0,0.5)', color: textColor }}>{part}</Text>
                    ) : (
                      <Text key={i}>{part}</Text>
                    )
                  )
                ) : (
                  item.text
                )}
                </Text>
                {isMe && !isGroup && !item.isDeleted && (
                  <View className="flex-row items-center self-end mt-1">
                      {item.status === 'read' || item.viewed ? (
                        <CheckCheck size={14} color="#34D399" strokeWidth={3} />
                      ) : item.status === 'delivered' || item.received ? (
                        <CheckCheck size={14} color={isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
                      ) : (
                        <Check size={14} color={isLightColor(primaryColor) && !isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
                      )}
                  </View>
                )}
            </View>
          )}
          
          {reactionMessageId === item.id && (
            <View 
              className={`absolute -top-14 ${isMe ? 'right-0' : 'left-0'} flex-row rounded-full px-3 py-2 shadow-2xl border z-50 justify-between items-center min-w-[240]`}
              style={{ backgroundColor: surfaceHigh, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', zIndex: 9999, elevation: 9999 }}
            >
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
              <View className="flex-row items-center border-l border-white/10 pl-2 ml-1">
                 {onForward && (
                   <TouchableOpacity 
                    onPress={() => onForward(item.id!)}
                    className="p-2 bg-blue-500/10 rounded-full mr-1"
                  >
                    <Forward size={18} color="#3b82f6" />
                  </TouchableOpacity>
                 )}
                 {isMe && (
                   <TouchableOpacity 
                    onPress={() => handleDeleteMessage(item.id!)}
                    className="p-2 bg-red-500/10 rounded-full"
                  >
                    <Trash size={18} color="#ff4d4d" />
                  </TouchableOpacity>
                 )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>

      {hasReactions && (
          <Animated.View 
            entering={FadeIn.duration(300).springify()}
            className={`flex-row flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            {Object.entries(item.reactions!).map(([emoji, uids]: [string, any]) => (
              <Animated.View 
                key={emoji} 
                entering={FadeIn.delay(100).springify()}
                className="rounded-full px-1.5 py-0.5 shadow-sm border mr-1 mb-1 flex-row items-center"
                style={{ backgroundColor: surfaceHigh, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <Text className="text-xs">{emoji}</Text>
                {Array.isArray(uids) && uids.length > 1 && <Text className="text-[10px] ml-0.5 font-bold" style={{ color: subTextColor }}>{uids.length}</Text>}
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

export default MessageItem;
