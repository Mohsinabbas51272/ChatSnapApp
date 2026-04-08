import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import ScreenBackground from '../components/ui/ScreenBackground';
import Header from '../components/ui/Header';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const TermsOfServiceScreen = ({ navigation }: any) => {
  const { isDarkMode } = useSelector((state: RootState) => state.theme);
  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <ScreenBackground>
      <Header title="Terms of Service" showBack navigation={navigation} />
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }}>
        <Text className="text-2xl font-black mb-4" style={{ color: textColor }}>User Agreement</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          By using ChatSnap, you agree to abide by the following terms and conditions. Please read them carefully.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>1. Acceptable Use</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          You agree not to use ChatSnap for any illegal activities, harassment, or spreading malicious content. We reserve the right to suspend accounts that violate these guidelines.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>2. Content Ownership</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          You remain the owner of the content you share on ChatSnap. However, by posting content, you grant us a license to transmit and store it for the purpose of provide the service.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>3. Account Security</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          You are responsible for maintaining the security of your account. Do not share your verification codes or credentials with anyone.
        </Text>

        <Text className="text-lg font-bold mb-2" style={{ color: textColor }}>4. Termination</Text>
        <Text className="text-sm leading-6 mb-6" style={{ color: subTextColor }}>
          We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including breach of terms.
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

export default TermsOfServiceScreen;
