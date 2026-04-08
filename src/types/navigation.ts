import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Register: undefined;
  Login: undefined;
  OTP: { phoneNumber: string; displayName: string; email: string; isNewUser: boolean; referralCode?: string };
  Home: undefined;
  Chat: { user?: any; group?: any; isSecret?: boolean };
  ProfileSetup: { isFromSettings?: boolean };
  FindFriends: undefined;
  PrivacySettings: undefined;
  Settings: undefined;
  QRProfile: undefined;
  QRScanner: undefined;
  AdminPanel: undefined;
  Wallet: undefined;
  Call: { callId: string; isIncoming: boolean; partnerName: string; partnerPhotoURL?: string | null; type: 'voice' | 'video' };
  MediaGallery: { conversationId: string; partnerName: string };
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  WallpaperSettings: undefined;
  ThemeSettings: undefined;
};

export type HomeTabParamList = {
  Chats: { searchQuery?: string };
  Stories: { searchQuery?: string };
  Contacts: { searchQuery?: string };
  Settings: undefined;
  Earn: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type HomeTabScreenProps<T extends keyof HomeTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<HomeTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
