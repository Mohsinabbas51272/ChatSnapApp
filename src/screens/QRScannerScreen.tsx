import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';
import { QrCode, RotateCcw, Keyboard } from 'lucide-react-native';
import { sendFriendRequest } from '../services/social';

// Fallback QR scanner that doesn't require native modules
const QRScannerScreen = () => {
  const [manualCode, setManualCode] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const handleManualAdd = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }

    try {
      // Try to parse as JSON first (for QR codes)
      let profileData: any;
      try {
        profileData = JSON.parse(manualCode);
      } catch {
        // If not JSON, treat as plain UID
        profileData = { uid: manualCode.trim(), type: 'chatsnap_profile', displayName: 'Friend' };
      }

      if (profileData.uid) {
        // Check if it's not the current user
        if (profileData.uid === user.uid) {
          Alert.alert('Oops!', 'This is your own code!');
          return;
        }

        Alert.alert(
          'Add Friend',
          `Add ${profileData.displayName || 'this user'} as a friend?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add',
              onPress: async () => {
                try {
                  await sendFriendRequest(profileData.uid, user.displayName || 'Anonymous', user.photoURL || undefined);
                  Alert.alert('Success!', 'Friend request sent!');
                  setManualCode('');
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Invalid Code', 'Please enter a valid friend code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process the code. Please try again.');
    }
  };

  return (
    <ScreenBackground>
      <StatusBar style="light" backgroundColor={primaryColor} />
      <Header title="Add Friend" showBack />

      <View className="flex-1 px-6">
        {!isManualMode ? (
          // QR Scanner UI (placeholder)
          <View className="flex-1 items-center justify-center">
            <View className="w-64 h-64 border-2 border-white/50 rounded-2xl items-center justify-center mb-8">
              <QrCode size={80} color="#d1d5db" />
              <Text className="text-white text-center mt-4 text-sm">
                QR Scanner Unavailable
              </Text>
            </View>

            <Text className="text-white text-center text-lg font-bold mb-2">
              Native Camera Module Issue
            </Text>
            <Text className="text-white/80 text-center mb-8 px-4">
              The QR scanner requires native modules that aren't available in Expo Go. Use manual entry instead.
            </Text>

            <TouchableOpacity
              onPress={() => setIsManualMode(true)}
              className="bg-primary px-8 py-4 rounded-lg flex-row items-center"
            >
              <Keyboard size={20} color="white" className="mr-2" />
              <Text className="text-onPrimary font-semibold ml-2">Enter Code Manually</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Manual entry mode
          <View className="flex-1 justify-center">
            <View className="bg-white/10 rounded-2xl p-6 mb-6">
              <Text className="text-white text-center text-lg font-bold mb-4">
                Enter Friend Code
              </Text>

              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Paste friend code or QR data here..."
                placeholderTextColor="#9ca3af"
                className="bg-white/20 text-white px-4 py-3 rounded-lg mb-4"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                onPress={handleManualAdd}
                className="bg-primary px-6 py-3 rounded-lg items-center mb-4"
              >
                <Text className="text-onPrimary font-semibold">Add Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsManualMode(false)}
                className="items-center"
              >
                <Text className="text-white/70">← Back to Scanner</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white/5 rounded-lg p-4">
              <Text className="text-white/80 text-sm text-center">
                Ask your friend to share their QR code data, or use their user ID if you have it.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
};

export default QRScannerScreen;