import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import ScreenBackground from '../components/ui/ScreenBackground';
import Header from '../components/ui/Header';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const PrivacyPolicyScreen = ({ navigation }: any) => {
  const { isDarkMode } = useSelector((state: RootState) => state.theme);
  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <ScreenBackground>
      <Header title="Privacy Policy" showBack navigation={navigation} />
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }}>
        <Text className="text-2xl font-black mb-4" style={{ color: textColor }}>Our Commitment</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          At ChatSnap, your privacy is our top priority. We believe in transparency and providing you with control over your data.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>1. Data Collection</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          We collect minimal data required to provide our messaging services. This includes your phone number, display name, and optional profile photo. We do not sell your personal data to third parties.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>2. Message Encryption</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          Messages sent via ChatSnap are stored securely. "Snap" messages and stories are designed to be ephemeral and are automatically deleted after they are viewed or expire.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>3. Location Data</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          If you choose to share your location, it is only shared with the specific recipient you select. We do not track your location in the background unless explicitly enabled for features like 'Snap Maps' (if applicable).
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>4. Your Rights</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          You have the right to delete your account and all associated data at any time through the app settings.
        </Text>

        <View className="mt-10 p-6 rounded-3xl bg-gray-500/10 border border-gray-500/20">
           <Text className="text-xs font-bold text-center" style={{ color: subTextColor }}>
             Last Updated: April 2026
           </Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

export default PrivacyPolicyScreen;
