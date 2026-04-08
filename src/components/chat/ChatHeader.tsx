import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Shield, Trash, MoreVertical, Phone, Video, Image as ImageIcon } from 'lucide-react-native';
import Header from '../ui/Header';
import { isLightColor, getContrastText } from '../../services/colors';

interface ChatHeaderProps {
  navigation: any;
  isGroup: boolean;
  groupName?: string;
  memberCount?: number;
  partnerName?: string;
  partnerStatusText?: string;
  partnerPhotoURL?: string;
  isOnline?: boolean;
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
  onCallVoice?: () => void;
  onCallVideo?: () => void;
  onViewMedia?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  navigation,
  isGroup,
  groupName,
  memberCount,
  partnerName,
  partnerStatusText,
  partnerPhotoURL,
  isOnline,
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
  onCallVoice,
  onCallVideo,
  onViewMedia,
}) => {
  const [showMenu, setShowMenu] = useState(false);
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
    <>
    <Header 
      navigation={navigation}
      title={isGroup ? groupName : partnerName} 
      subtitle={isGroup ? `${memberCount} members` : partnerStatusText}
      avatar={!isGroup ? partnerPhotoURL : undefined}
      isOnline={!isGroup ? isOnline : false}
      showBack 
      rightElement={
        <View className="flex-row items-center">
          {!isGroup && !showInChatSearch && (
            <>
              <TouchableOpacity 
                onPress={onCallVoice} 
                className="p-2.5 rounded-full mr-1"
              >
                <Phone size={20} color={headerIconColor} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onCallVideo} 
                className="p-2.5 rounded-full mr-1"
              >
                <Video size={20} color={headerIconColor} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
              onPress={() => setShowMenu(true)} 
              className="p-2.5 rounded-full" 
            >
              <MoreVertical size={20} color={headerIconColor} />
          </TouchableOpacity>
        </View>
      }
    />

      {/* Dropdown Menu Modal */}
      <Modal visible={showMenu} transparent={true} animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View className="flex-1">
            <View 
              className="absolute right-4 top-16 w-56 rounded-2xl shadow-xl overflow-hidden py-2"
              style={{ 
                backgroundColor: isDarkMode ? '#1e1e24' : '#FFFFFF',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 
              }}
            >
              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => { setShowMenu(false); setShowInChatSearch(true); }}
              >
                <Search size={18} color={isDarkMode ? '#FFFFFF' : '#1a1c1e'} />
                <Text className="ml-3 font-bold" style={{ color: isDarkMode ? '#FFFFFF' : '#1a1c1e' }}>Search within Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => { setShowMenu(false); onViewMedia?.(); }}
              >
                <ImageIcon size={18} color={isDarkMode ? '#FFFFFF' : '#1a1c1e'} />
                <Text className="ml-3 font-bold" style={{ color: isDarkMode ? '#FFFFFF' : '#1a1c1e' }}>View Media Gallery</Text>
              </TouchableOpacity>

              {!isGroup && (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => { setShowMenu(false); handleToggleSecret(); }}
              >
                <Shield size={18} color={isDarkMode ? '#FFFFFF' : '#1a1c1e'} fill={isSecret ? (isDarkMode ? '#FFFFFF' : '#1a1c1e') : 'transparent'} />
                <Text className="ml-3 font-bold" style={{ color: isDarkMode ? '#FFFFFF' : '#1a1c1e' }}>{isSecret ? "Disable Secret Chat" : "Enable Secret"}</Text>
              </TouchableOpacity>
              )}

              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => { 
                  setShowMenu(false);
                  Alert.alert("Clear Chat", "Are you sure you want to delete all messages?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear", style: "destructive", onPress: handleClearChat }
                  ]);
                }}
              >
                <Trash size={18} color="#EF4444" />
                <Text className="ml-3 font-bold text-red-500">Clear Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-t"
                style={{ borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                onPress={() => { 
                  setShowMenu(false);
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
              >
                <MoreVertical size={18} color={blockedByMe ? "#10B981" : "#EF4444"} />
                <Text className={`ml-3 font-bold ${blockedByMe ? "text-emerald-500" : "text-red-500"}`}>{blockedByMe ? "Unblock User" : "Block User"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default ChatHeader;
