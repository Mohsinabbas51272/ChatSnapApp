import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Shield, Trash, MoreVertical } from 'lucide-react-native';
import Header from '../ui/Header';

interface ChatHeaderProps {
  navigation: any;
  isGroup: boolean;
  groupName?: string;
  memberCount?: number;
  partnerName?: string;
  partnerStatusText?: string;
  primaryColor: string;
  showInChatSearch: boolean;
  setShowInChatSearch: (show: boolean) => void;
  chatSearchQuery: string;
  setChatSearchQuery: (query: string) => void;
  isSecret: boolean;
  handleToggleSecret: () => void;
  handleClearChat: () => void;
  blockedByMe: boolean;
  handleBlockToggle: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  navigation,
  isGroup,
  groupName,
  memberCount,
  partnerName,
  partnerStatusText,
  primaryColor,
  showInChatSearch,
  setShowInChatSearch,
  chatSearchQuery,
  setChatSearchQuery,
  isSecret,
  handleToggleSecret,
  handleClearChat,
  blockedByMe,
  handleBlockToggle,
}) => {
  if (showInChatSearch) {
    return (
      <SafeAreaView edges={['top']} style={{ backgroundColor: primaryColor }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity 
            className="p-2 mr-2" 
            onPress={() => { setShowInChatSearch(false); setChatSearchQuery(''); }}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1 bg-white/20 rounded-full flex-row items-center px-4 h-11">
            <Search size={18} color="white" />
            <TextInput 
              className="flex-1 ml-2 text-white font-bold h-full"
              placeholder="Find in chat..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={chatSearchQuery}
              onChangeText={setChatSearchQuery}
              autoFocus
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Header 
      navigation={navigation}
      title={isGroup ? groupName : partnerName} 
      subtitle={isGroup ? `${memberCount} members` : partnerStatusText}
      showBack 
      rightElement={
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => setShowInChatSearch(true)}
            className="p-2.5 rounded-full mr-1"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Search size={20} color="white" />
          </TouchableOpacity>
          {!isGroup && (
            <TouchableOpacity 
              onPress={handleToggleSecret} 
              className="p-2.5 rounded-full mr-1"
              style={{ backgroundColor: isSecret ? 'rgba(255,255,255,0.3)' : 'transparent' }}
            >
              <Shield size={20} color="white" fill={isSecret ? 'white' : 'transparent'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => {
              Alert.alert("Clear Chat", "Are you sure you want to delete all messages?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: handleClearChat }
              ]);
            }} 
            className="p-2.5 rounded-full mr-1"
          >
            <Trash size={20} color="white" />
          </TouchableOpacity>
          {!isGroup && (
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  blockedByMe ? "Unblock User" : "Block User", 
                  `Are you sure you want to ${blockedByMe ? 'unblock' : 'block'} this user?`, 
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: blockedByMe ? "Unblock" : "Block", 
                      style: "destructive", 
                      onPress: handleBlockToggle
                    }
                  ]
                );
              }} 
              className="p-2.5 rounded-full" 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <MoreVertical size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
};

export default ChatHeader;
