import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Eye, Bell, Globe, ChevronRight } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Header from '../components/ui/Header';

const PrivacySettingsScreen = () => {
    const { primaryColor } = useSelector((state: RootState) => state.theme);
    const [showOnline, setShowOnline] = useState(true);
    const [readReceipts, setReadReceipts] = useState(true);
    const [allowStrangers, setAllowStrangers] = useState(false);

    const PrivacyItem = ({ icon: Icon, title, description, value, onToggle }: any) => (
        <View className="flex-row items-center p-5 bg-surface-container-low rounded-xl mb-3 border border-outline-variant/5">
            <View className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center">
                <Icon size={18} color={primaryColor} />
            </View>
            <View className="flex-1 ml-4 mr-2">
                <Text className="text-base font-semibold text-onSurface">{title}</Text>
                <Text className="text-onSurface-variant text-xs mt-0.5">{description}</Text>
            </View>
            <Switch 
                value={value} 
                onValueChange={onToggle}
                trackColor={{ false: '#222532', true: primaryColor }}
                thumbColor="white"
            />
        </View>
    );

    return (
        <View className="flex-1 bg-surface">
            <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
            <Header title="Privacy" showBack transparent={false} />
            
            <ScrollView className="px-6 py-8">

                <View className="mb-6">
                    <Text className="text-outline text-[10px] font-bold uppercase tracking-widest ml-1 mb-4">Who can see me</Text>
                    <PrivacyItem 
                        icon={Eye} 
                        title="Active Status" 
                        description="Show when you're online to your friends" 
                        value={showOnline} 
                        onToggle={setShowOnline} 
                    />
                    <PrivacyItem 
                        icon={Globe} 
                        title="Contact Sync" 
                        description="Let friends find you by your phone number" 
                        value={true} 
                        onToggle={() => {}} 
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-outline text-[10px] font-bold uppercase tracking-widest ml-1 mb-4">Messaging</Text>
                    <PrivacyItem 
                        icon={Bell} 
                        title="Read Receipts" 
                        description="Others can see when you've opened their snaps" 
                        value={readReceipts} 
                        onToggle={setReadReceipts} 
                    />
                    <PrivacyItem 
                        icon={Shield} 
                        title="Block Strangers" 
                        description="Only receive messages from your contacts" 
                        value={allowStrangers} 
                        onToggle={setAllowStrangers} 
                    />
                </View>

                <TouchableOpacity className="flex-row items-center p-5 bg-error/10 rounded-xl mt-4">
                    <Text className="text-error font-bold flex-1">Permanently Delete Account</Text>
                    <ChevronRight size={18} color="#ff6e85" />
                </TouchableOpacity>

                <View className="py-12 items-center">
                    <Text className="text-onSurface-variant/40 text-[10px] text-center">Your privacy is our top priority. We use end-to-end encryption for all secret chats.</Text>
                </View>
            </ScrollView>
        </View>
    );
};

export default PrivacySettingsScreen;
