import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Header from '../components/ui/Header';
import ScreenBackground from '../components/ui/ScreenBackground';
import { useNavigation } from '@react-navigation/native';
import { QrCode, RotateCcw, Keyboard, Camera as CameraIcon } from 'lucide-react-native';
import { sendFriendRequest } from '../services/social';
import { CameraView, useCameraPermissions } from 'expo-camera';

const QRScannerScreen = () => {
  const navigation = useNavigation();
  const [manualCode, setManualCode] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [scanned, setScanned] = useState(false);
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const [permission, requestPermission] = useCameraPermissions();

  const handleManualAdd = async (code: string) => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }

    try {
      // Try to parse as JSON first (for QR codes)
      let profileData: any;
      try {
        profileData = JSON.parse(code);
      } catch {
        // If not JSON, treat as plain UID
        profileData = { uid: code.trim(), type: 'chatsnap_profile', displayName: 'Friend' };
      }

      if (profileData.uid) {
        // Check if it's not the current user
        if (profileData.uid === user.uid) {
          Alert.alert('Oops!', 'This is your own code!');
          setScanned(false);
          return;
        }

        Alert.alert(
          'Add Friend',
          `Add ${profileData.displayName || 'this user'} as a friend?`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => setScanned(false)
            },
            {
              text: 'Add',
              onPress: async () => {
                try {
                  await sendFriendRequest(profileData.uid, user.displayName || 'Anonymous', user.photoURL || undefined);
                  Alert.alert('Success!', 'Friend request sent!');
                  setManualCode('');
                  setScanned(false);
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                  setScanned(false);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Invalid Code', 'Please enter a valid friend code');
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process the code. Please try again.');
      setScanned(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    handleManualAdd(data);
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <ScreenBackground>
        <Header title="Add Friend" showBack navigation={navigation} />
        <View className="flex-1 items-center justify-center px-8">
          <CameraIcon size={64} color="#737580" className="mb-4" />
          <Text className="text-onSurface text-center text-lg font-bold mb-4">
            Camera Permission Needed
          </Text>
          <Text className="text-onSurface-variant text-center mb-8">
            We need your permission to show the camera and scan QR codes.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-primary px-8 py-4 rounded-full"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="text-white font-bold">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <StatusBar style="light" backgroundColor={primaryColor} />
      <Header title="Add Friend" showBack navigation={navigation} />

      <View className="flex-1">
        {!isManualMode ? (
          <View className="flex-1">
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Overlay */}
            <View className="flex-1 items-center justify-center bg-black/40">
              <View className="w-72 h-72 border-2 border-white/80 rounded-3xl items-center justify-center relative">
                 {/* Corner decorations */}
                 <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: primaryColor }} />
                 <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: primaryColor }} />
                 <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: primaryColor }} />
                 <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: primaryColor }} />
                 
                 {scanned && (
                   <View className="bg-primary/90 px-6 py-2 rounded-full">
                     <Text className="text-white font-bold">Processing...</Text>
                   </View>
                 )}
              </View>
              <Text className="text-white text-center mt-10 text-lg font-bold">
                 Align QR Code to scan
              </Text>
              
              <TouchableOpacity
                onPress={() => setIsManualMode(true)}
                className="absolute bottom-20 bg-white/20 px-8 py-4 rounded-full flex-row items-center border border-white/10"
              >
                <Keyboard size={20} color="white" />
                <Text className="text-white font-bold ml-3">Enter Code Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1 px-6 justify-center">
            <View className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-xl">
              <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-6">
                 <Keyboard size={32} color={primaryColor} />
              </View>
              <Text className="text-onSurface text-center text-2xl font-black mb-2 tracking-tight">
                Enter Friend Code
              </Text>
              <Text className="text-onSurface-variant text-center mb-8">
                Paste the unique friend code or raw QR data shared with you.
              </Text>

              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Paste code here..."
                placeholderTextColor="#464752"
                className="bg-surface-container-highest text-onSurface px-6 py-5 rounded-2xl mb-6 text-sm font-mono border border-outline-variant/10"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                onPress={() => handleManualAdd(manualCode)}
                className="py-4 rounded-full items-center mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                <Text className="text-white font-bold text-lg">Add Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsManualMode(false)}
                className="items-center py-2"
              >
                <Text className="text-primary font-bold">Switch to Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
};

export default QRScannerScreen;