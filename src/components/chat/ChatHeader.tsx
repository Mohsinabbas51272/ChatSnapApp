import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Shield, Trash, MoreVertical } from 'lucide-react-native';
import Header from '../ui/Header';
import { isLightColor, getContrastText } from '../../services/colors';

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
  isDarkMode: boolean;
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
  isDarkMode,
}) => {
  if (showInChatSearch) {
    const searchTextColor = getContrastText(primaryColor);
    const searchIconColor = isLightColor(primaryColor) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
    const searchBg = isLightColor(primaryColor) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)';

    return (
      <SafeAreaView edges={['top']} style={{ backgroundColor: primaryColor }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity 
            className="p-2 mr-2" 
            onPress={() => { setShowInChatSearch(false); setChatSearchQuery(''); }}
          >
            <ChevronLeft size={24} color={searchTextColor} />
          </TouchableOpacity>
          <View 
            className="flex-1 rounded-full flex-row items-center px-4 h-11"
            style={{ backgroundColor: searchBg }}
          >
            <Search size={18} color={searchIconColor} />
            <TextInput 
              className="flex-1 ml-2 font-bold h-full"
              style={{ color: searchTextColor }}
              placeholder="Find in chat..."
              placeholderTextColor={searchIconColor}
              value={chatSearchQuery}
              onChangeText={setChatSearchQuery}
              autoFocus
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const headerIconColor = isDarkMode ? 'white' : (isLightColor(primaryColor) ? '#1a1c1e' : 'white');
  const headerIconBg = isDarkMode ? 'rgba(255,255,255,0.2)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)');

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
            style={{ backgroundColor: headerIconBg }}
          >
            <Search size={20} color={headerIconColor} />
          </TouchableOpacity>
          {!isGroup && (
            <TouchableOpacity 
              onPress={handleToggleSecret} 
              className="p-2.5 rounded-full mr-1"
              style={{ backgroundColor: isSecret ? (isDarkMode ? 'rgba(255,255,255,0.3)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)')) : 'transparent' }}
            >
              <Shield size={20} color={headerIconColor} fill={isSecret ? (isLightColor(primaryColor) && !isDarkMode ? '#000' : 'white') : 'transparent'} />
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
            <Trash size={20} color={headerIconColor} />
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
              style={{ backgroundColor: headerIconBg }}
            >
              <MoreVertical size={20} color={headerIconColor} />
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
};

export default ChatHeader;
