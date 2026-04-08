import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import ScreenBackground from '../components/ui/ScreenBackground';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react-native';
import { submitSupportRequest, listenUserSupportRequests, SupportRequest } from '../services/support';

const statusColors: Record<string, string> = {
  open: '#2563eb',
  'in-progress': '#f59e0b',
  resolved: '#10b981',
  closed: '#6b7280',
};

const SupportScreen = () => {
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const [contact, setContact] = useState(user.phoneNumber || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportRequest[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = listenUserSupportRequests(user.uid, (data) => {
      setTickets(data);
      setLoadingTickets(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      return Alert.alert('Required', 'Please enter a title and describe the problem.');
    }

    setSubmitting(true);
    try {
      await submitSupportRequest({
        uid: user.uid!,
        displayName: user.displayName || 'Anonymous',
        phoneNumber: user.phoneNumber || undefined,
        contact: contact.trim() || undefined,
        title: title.trim(),
        message: message.trim(),
      });
      setTitle('');
      setMessage('');
      Alert.alert('Sent', 'Your complaint has been submitted. Admin will reply from the support panel.');
    } catch (error) {
      console.error('Support submit error', error);
      Alert.alert('Error', 'Unable to send your support request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full items-center justify-center bg-black/5 dark:bg-white/10">
            <ArrowLeft size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <MessageCircle size={18} color={primaryColor} />
            <Text className="text-base font-black ml-2" style={{ color: isDarkMode ? '#fff' : '#1a1c1e' }}>Help & Support</Text>
          </View>
          <View className="w-10" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="px-5">
          <View className="rounded-3xl p-5 mb-6" style={{ backgroundColor: isDarkMode ? '#0f111a' : '#F7F8FD' }}>
            <Text className="text-lg font-black mb-3" style={{ color: isDarkMode ? '#fff' : '#111827' }}>Submit a complaint</Text>
            <Text className="text-sm mb-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
              Send your issue directly to customer support. Admin will respond inside the app.
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#111827' }}>Contact (phone or email)</Text>
              <View className="flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: isDarkMode ? '#101419' : '#fff' }}>
                <Phone size={16} color={primaryColor} />
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Phone or email"
                  placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF'}
                  className="ml-3 flex-1 text-base"
                  style={{ color: isDarkMode ? '#fff' : '#1f2937' }}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#111827' }}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Summarize your problem"
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF'}
                className="rounded-2xl px-4 py-3 text-base"
                style={{ backgroundColor: isDarkMode ? '#101419' : '#fff', color: isDarkMode ? '#fff' : '#1f2937' }}
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#111827' }}>Problem description</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe the issue in detail"
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF'}
                className="rounded-2xl px-4 py-4 text-base min-h-[140px]"
                style={{ backgroundColor: isDarkMode ? '#101419' : '#fff', color: isDarkMode ? '#fff' : '#1f2937' }}
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.8}
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-bold text-white">Send Complaint</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#6b7280' }}>My support tickets</Text>

          {loadingTickets ? (
            <ActivityIndicator color={primaryColor} className="mt-10" />
          ) : tickets.length === 0 ? (
            <View className="rounded-3xl p-6" style={{ backgroundColor: isDarkMode ? '#0f111a' : '#F7F8FD' }}>
              <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>No support tickets yet. Submit a complaint to get help from admin.</Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket.id} className="rounded-[32px] p-5 mb-4 border" style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF', borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="font-black text-base" style={{ color: isDarkMode ? '#fff' : '#111827' }}>{ticket.title}</Text>
                    <Text className="text-sm mt-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.75)' : '#6b7280' }}>{ticket.message}</Text>
                  </View>
                  <View className="rounded-full px-4 py-2 items-center justify-center shadow-sm" style={{ backgroundColor: statusColors[ticket.status] || '#d1d5db', shadowColor: statusColors[ticket.status] || '#d1d5db', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 }}>
                    <Text className="text-[11px] font-black uppercase" style={{ color: 'white', letterSpacing: 0.5 }}>{ticket.status.replace('-', ' ')}</Text>
                  </View>
                </View>
                {ticket.response ? (
                  <View className="rounded-3xl p-4 mt-2" style={{ backgroundColor: isDarkMode ? '#111827' : '#F8FAFC' }}>
                    <Text className="text-sm font-black mb-2" style={{ color: isDarkMode ? '#fff' : '#111827' }}>Admin response</Text>
                    <Text className="text-sm" style={{ color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>{ticket.response}</Text>
                  </View>
                ) : (
                  <Text className="text-sm mt-2" style={{ color: isDarkMode ? 'rgba(255,255,255,0.62)' : '#6b7280' }}>Admin has not responded yet.</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

export default SupportScreen;
