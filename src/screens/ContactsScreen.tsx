import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus } from 'lucide-react-native';
import Header from '../components/ui/Header';
import { syncContacts, ContactUser } from '../services/contacts';
import { useNavigation } from '@react-navigation/native';

import { useSelector } from 'react-redux';
import { RootState } from '../store';

const ContactsScreen = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const filteredContacts = useMemo(() => contacts.filter(contact => 
    (contact.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (contact.phoneNumber || '').includes(searchQuery || '')
  ), [contacts, searchQuery]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const synced = await syncContacts();
      setContacts(synced);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: ContactUser }) => (
    <TouchableOpacity 
      className="flex-row items-center px-4 py-4 rounded-xl mx-2 mb-1"
      onPress={() => navigation.navigate('Chat', { user: item })}
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 bg-surface-container-highest rounded-full items-center justify-center overflow-hidden border border-outline-variant/20">
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} className="w-full h-full" />
        ) : (
          <Text className="text-primary font-bold text-lg">
            {(item.displayName || item.phoneNumber || '?').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-onSurface font-semibold text-base">{item.displayName}</Text>
        <Text className="text-onSurface-variant text-sm">{item.phoneNumber}</Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-10 px-10">
              <Text className="text-onSurface-variant text-center">No registered contacts found. Invite your friends!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ContactsScreen;
