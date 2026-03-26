import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, User, Check } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import { RootState } from '../store';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import Header from '../components/ui/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ui/ScreenBackground';

const ProfileSetupScreen = () => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const authState = useSelector((state: RootState) => state.auth);
  const [displayName, setDisplayName] = useState(authState.displayName || '');
  const [image, setImage] = useState<string | null>(authState.photoURL || null);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2, // Drastically reduced for 1MB Firestore limit
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!authState.uid) {
      alert('Error: User ID missing. Please login again.');
      return;
    }

    if (displayName.trim()) {
      try {
        let finalPhotoURL = image || authState.photoURL || null;

        // If it's a new local image (starting with file://), convert to Base64
        if (image && image.startsWith('file://')) {
          const base64 = await FileSystem.readAsStringAsync(image, {
            encoding: FileSystem.EncodingType.Base64,
          });
          finalPhotoURL = `data:image/jpeg;base64,${base64}`;
        }

        const userData = {
          uid: authState.uid,
          phoneNumber: authState.phoneNumber,
          displayName: displayName,
          photoURL: finalPhotoURL,
          isNewUser: false,
          updatedAt: new Date().toISOString(),
        };

        // Update Firestore
        const userRef = doc(db, 'users', authState.uid);
        await setDoc(userRef, userData, { merge: true });

        // Update Redux & Storage
        dispatch(setUser(userData));
        await AsyncStorage.setItem('user', JSON.stringify(userData));

        // Navigate to Home
        navigation.replace('Home');
      } catch (error: any) {
        console.error('Initial setup error:', error);
        alert('Setup failed: ' + error.message);
      }
    }
  };

  return (
    <ScreenBackground>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      <Header title="Setup Profile" showBack />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-8">
          <Text className="text-onSurface-variant font-medium">Let others know who you are by adding a name and photo.</Text>

          <View className="items-center mt-12 mb-10">
            <TouchableOpacity onPress={pickImage} className="relative">
              <View className="w-32 h-32 bg-surface-container-highest rounded-full items-center justify-center overflow-hidden border-2 border-dashed border-outline-variant">
                {image ? (
                  <Image source={{ uri: image }} className="w-full h-full" />
                ) : (
                  <User size={60} color="#464752" />
                )}
              </View>
              <View className="absolute bottom-1 right-1 p-2 rounded-full border-4 border-surface"
                    style={{ backgroundColor: '#4963ff' }}>
                <Camera size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-outline text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Display Name</Text>
              <TextInput
                className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-lg text-onSurface border border-outline-variant/10"
                placeholder="How do you want to be seen?"
                placeholderTextColor="#464752"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <TouchableOpacity
              onPress={handleComplete}
              className="w-full py-4 rounded-full items-center flex-row justify-center"
              disabled={!displayName.trim()}
              style={{ 
                backgroundColor: displayName.trim() ? '#4963ff' : '#222532',
                shadowColor: displayName.trim() ? '#4963ff' : 'transparent',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: displayName.trim() ? 8 : 0,
              }}
            >
              <Text className="text-white font-bold text-lg mr-2">Finish Setup</Text>
              <Check size={20} color="white" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

export default ProfileSetupScreen;
