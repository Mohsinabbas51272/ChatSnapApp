import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, TextInput, Clipboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';
import { QrCode, Share2, Copy, Eye, EyeOff } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

const QRProfileScreen = () => {
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const [showRawData, setShowRawData] = useState(false);

  const qrData = useMemo(() => {
    return JSON.stringify({
      type: 'chatsnap_profile',
      uid: user.uid,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      timestamp: Date.now()
    });
  }, [user]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Add me on ChatSnap!\n\nMy Profile: ${user.displayName}\nPhone: ${user.phoneNumber}`,
        title: 'ChatSnap Profile'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = () => {
    // In a real app, you'd generate a deep link
    Alert.alert('Copied!', 'Profile link copied to clipboard');
  };

  const handleCopyRawData = async () => {
    try {
      await Clipboard.setString(qrData);
      Alert.alert('Copied!', 'QR data copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy data');
    }
  };

  return (
    <ScreenBackground>
      <StatusBar style="light" backgroundColor={primaryColor} />
      <Header title="My QR Code" showBack />

      <View className="flex-1 px-6 py-8">
        <View className="items-center">
          <View className="bg-white p-6 rounded-3xl shadow-2xl mb-6">
            <QRCode
              value={qrData}
              size={200}
              color={primaryColor}
              backgroundColor="white"
            />
          </View>

          <Text className="text-2xl font-black text-onSurface text-center mb-2">
            {user.displayName}
          </Text>
          <Text className="text-onSurface-variant text-center mb-8">
            Scan this code to add me as a friend
          </Text>

          <View className="w-full space-y-4">
            <View className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 shadow-sm mb-2">
                <Text className="text-[10px] uppercase font-black text-primary tracking-widest mb-3 text-center">My Friend Code</Text>
                <View className="flex-row items-center bg-surface-container-highest px-4 py-3 rounded-2xl border border-outline-variant/5">
                   <Text className="flex-1 text-onSurface font-mono text-xs font-bold" numberOfLines={1}>{user.uid}</Text>
                   <TouchableOpacity 
                    onPress={async () => {
                      await Clipboard.setString(user.uid || '');
                      Alert.alert('Copied!', 'Friend code copied to clipboard');
                    }}
                    className="p-2 ml-2 bg-primary/10 rounded-full"
                   >
                      <Copy size={16} color={primaryColor} />
                   </TouchableOpacity>
                </View>
                <Text className="text-[10px] text-onSurface-variant text-center mt-3 font-medium px-4">
                  Share this code with friends who can't scan your QR code to add you manually.
                </Text>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              className="flex-row items-center justify-center py-4 px-6 bg-surface-container-low rounded-2xl border border-outline-variant/5"
            >
              <Share2 size={20} color={primaryColor} />
              <Text className="ml-3 text-onSurface font-bold text-base">Share Profile Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowRawData(!showRawData)}
              className="flex-row items-center justify-center py-3 px-6 bg-transparent"
            >
              <Text className="text-onSurface-variant font-bold text-xs uppercase tracking-widest">
                {showRawData ? 'Hide' : 'Show'} Advanced Info
              </Text>
            </TouchableOpacity>
          </View>

          {showRawData && (
            <View className="w-full mt-6 p-4 bg-surface-container-low rounded-2xl">
              <Text className="text-onSurface font-bold mb-2">Raw QR Data:</Text>
              <TextInput
                value={qrData}
                editable={false}
                multiline
                className="bg-white/10 text-onSurface p-3 rounded-lg text-xs font-mono"
                textAlignVertical="top"
              />
              <TouchableOpacity
                onPress={handleCopyRawData}
                className="flex-row items-center justify-center mt-3 py-2 px-4 bg-primary rounded-lg"
              >
                <Copy size={16} color="white" />
                <Text className="ml-2 text-onPrimary font-semibold text-sm">Copy Data</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-6 p-4 bg-surface-container-low rounded-2xl w-full">
            <Text className="text-onSurface-variant text-center text-sm">
              Your QR code is unique to you and expires after 24 hours for security.
            </Text>
            <Text className="text-onSurface-variant text-center text-sm mt-2">
              If QR scanning doesn't work, share the raw data above for manual entry.
            </Text>
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
};

export default QRProfileScreen;