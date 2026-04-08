import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Search, ArrowLeft, Phone, Mail, CheckCircle, Clock, MessageCircle } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { listenAllSupportRequests, respondToSupportRequest, SupportRequest as SupportRequestType } from '../services/support';
import { useNavigation } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { RootState } from '../store';
import ScreenBackground from '../components/ui/ScreenBackground';
import { getPendingWithdrawals, fulfillWithdrawal, AdminWithdrawal } from '../services/admin';

const AdminPanelScreen = () => {
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const [activeTab, setActiveTab] = useState<'users'|'withdrawals'|'support'>('users');
    
    // User Tab State
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    
    // Withdrawals Tab State
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Support Tab State
    const [supportRequests, setSupportRequests] = useState<SupportRequestType[]>([]);
    const [loadingSupport, setLoadingSupport] = useState(false);
    const [selectedSupport, setSelectedSupport] = useState<SupportRequestType | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [responseProcessingId, setResponseProcessingId] = useState<string | null>(null);

    const navigation = useNavigation<any>();

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const surfaceLow = isDarkMode ? '#000000' : '#FFFFFF';
    const surfaceHigh = isDarkMode ? '#1a1c1e' : '#F0F2FA';

    // Users effect
    useEffect(() => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(fetchedUsers);
            setFilteredUsers(fetchedUsers);
        });

        return () => unsubscribe();
    }, []);

    // Withdrawals effect
    useEffect(() => {
        if (activeTab === 'withdrawals') {
           loadWithdrawals();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'support') return;

        setLoadingSupport(true);
        const unsubscribe = listenAllSupportRequests((requests) => {
            setSupportRequests(requests);
            setLoadingSupport(false);
        });

        return () => unsubscribe();
    }, [activeTab]);

    const loadWithdrawals = async () => {
        setLoadingWithdrawals(true);
        try {
            const data = await getPendingWithdrawals();
            setWithdrawals(data);
        } catch (e) {
            console.error("Error loading withdrawals", e);
        } finally {
            setLoadingWithdrawals(false);
        }
    };

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredUsers(users);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = users.filter((u) => 
                (u.displayName && u.displayName.toLowerCase().includes(lowerQuery)) ||
                (u.phoneNumber && u.phoneNumber.includes(lowerQuery)) ||
                (u.email && u.email.toLowerCase().includes(lowerQuery))
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    const handleFulfill = async (item: AdminWithdrawal) => {
        setProcessingId(item.id);
        const result = await fulfillWithdrawal(item.uid, item.transactionId, item.id);
        if (result.success) {
            Alert.alert("Success", "Transaction fulfilled.");
            // remove from active list
            setWithdrawals(prev => prev.filter(w => w.id !== item.id));
        } else {
            Alert.alert("Failed", result.message);
        }
        setProcessingId(null);
    };

    const renderUser = ({ item }: { item: any }) => (
        <View className="flex-row items-center p-4 mb-3 rounded-2xl mx-5" style={{ backgroundColor: surfaceLow }}>
            <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${primaryColor}20` }}>
                <Text className="text-lg font-black" style={{ color: primaryColor }}>
                    {(item.displayName || '?').charAt(0).toUpperCase()}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="font-bold text-base" style={{ color: textColor }}>{item.displayName || 'Anonymous User'}</Text>
                {item.phoneNumber && (
                    <View className="flex-row items-center mt-1">
                        <Phone size={10} color={subTextColor} />
                        <Text className="text-xs ml-1 font-mono" style={{ color: subTextColor }}>{item.phoneNumber}</Text>
                    </View>
                )}
                {item.email && (
                    <View className="flex-row items-center mt-0.5">
                        <Mail size={10} color={subTextColor} />
                        <Text className="text-[10px] ml-1" style={{ color: subTextColor }}>{item.email}</Text>
                    </View>
                )}
            </View>
            <View className="items-end">
                <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
                    {item.status || 'Offline'}
                </Text>
            </View>
        </View>
    );

    const renderWithdrawal = ({ item }: { item: AdminWithdrawal }) => (
        <View className="p-4 mb-3 rounded-2xl mx-5 border" style={{ backgroundColor: surfaceLow, borderColor: isDarkMode ? '#333' : '#E5E5EA' }}>
            <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                    <Clock size={16} color="#FF9500" />
                    <Text className="font-bold ml-1 text-sm" style={{ color: '#FF9500' }}>Pending</Text>
                </View>
                <Text className="font-black text-lg" style={{ color: textColor }}>
                   {item.amount} Coins
                </Text>
            </View>
            <Text className="font-bold" style={{ color: textColor }}>User: {item.userDisplayName}</Text>
            <Text className="text-sm mt-2" style={{ color: subTextColor }}>Account: {item.accountDetails}</Text>
            
            <TouchableOpacity 
               onPress={() => handleFulfill(item)}
               disabled={processingId === item.id}
               className="mt-4 py-3 rounded-full flex-row justify-center items-center"
               style={{ backgroundColor: primaryColor }}
            >
               {processingId === item.id ? (
                   <ActivityIndicator color="white" />
               ) : (
                   <>
                       <CheckCircle size={18} color="white" />
                       <Text className="ml-2 font-bold text-white">Mark as Fulfilled</Text>
                   </>
               )}
            </TouchableOpacity>
        </View>
    );

    const handleSendSupportResponse = async () => {
        if (!selectedSupport) return;
        if (!replyMessage.trim()) {
            Alert.alert('Error', 'Please enter a response message.');
            return;
        }

        setResponseProcessingId(selectedSupport.id);
        try {
            await respondToSupportRequest(selectedSupport.id, replyMessage.trim(), 'resolved');
            Alert.alert('Response sent', 'Your reply has been saved and the user will be notified.');
            setSelectedSupport(null);
            setReplyMessage('');
        } catch (error) {
            console.error('Support response error', error);
            Alert.alert('Error', 'Unable to send response. Please try again.');
        } finally {
            setResponseProcessingId(null);
        }
    };

    const renderSupportRequest = ({ item }: { item: SupportRequestType }) => (
        <View className="p-4 mb-3 rounded-2xl mx-5 border" style={{ backgroundColor: surfaceLow, borderColor: isDarkMode ? '#333' : '#E5E5EA' }}>
            <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1 pr-3">
                    <Text className="font-bold text-base" style={{ color: textColor }}>{item.title}</Text>
                    <Text className="text-sm mt-1" style={{ color: subTextColor }}>{item.message}</Text>
                </View>
                <View className="rounded-full px-4 py-2 items-center justify-center" style={{ backgroundColor: item.status === 'open' ? '#2563eb' : item.status === 'in-progress' ? '#f59e0b' : item.status === 'resolved' ? '#10b981' : '#6b7280', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                    <Text className="text-[11px] font-black uppercase" style={{ color: 'white', letterSpacing: 0.5 }}>{item.status.replace('-', ' ')}</Text>
                </View>
            </View>
            <Text className="text-xs mb-1" style={{ color: subTextColor }}>Contact: {item.contact || item.phoneNumber || 'Not provided'}</Text>
            {item.response ? (
                <View className="rounded-2xl p-3 mt-3" style={{ backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }}>
                    <Text className="text-xs font-bold mb-1" style={{ color: textColor }}>Reply</Text>
                    <Text className="text-sm" style={{ color: subTextColor }}>{item.response}</Text>
                </View>
            ) : (
                <Text className="text-sm mt-3" style={{ color: subTextColor }}>No reply sent yet.</Text>
            )}
            <TouchableOpacity
                onPress={() => setSelectedSupport(item)}
                className="mt-4 py-3 rounded-full flex-row justify-center items-center"
                style={{ backgroundColor: primaryColor }}
            >
                <MessageCircle size={16} color="white" />
                <Text className="ml-2 font-bold text-white">Reply</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenBackground>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <SafeAreaView edges={['top']} className="flex-1">
                {/* Header */}
                <View className="px-5 py-4 flex-row justify-between items-center z-10 bg-transparent">
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 rounded-full items-center justify-center bg-black/5 dark:bg-white/10"
                    >
                        <ArrowLeft size={20} color={isDarkMode ? 'white' : 'black'} />
                    </TouchableOpacity>
                    <View className="flex-row items-center">
                        <Shield size={16} color={primaryColor} />
                        <Text className="text-base font-black ml-2" style={{ color: textColor }}>Admin Portal</Text>
                    </View>
                    <View className="w-10" />
                </View>

                {/* Tabs */}
                <View className="flex-row px-5 mb-4 space-x-2">
                   <TouchableOpacity 
                     onPress={() => setActiveTab('users')}
                     className="flex-1 py-3 items-center rounded-xl"
                     style={{ backgroundColor: activeTab === 'users' ? primaryColor : surfaceLow }}
                   >
                     <Text className="font-bold" style={{ color: activeTab === 'users' ? 'white' : textColor }}>Users Database</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setActiveTab('withdrawals')}
                     className="flex-1 py-3 items-center rounded-xl"
                     style={{ backgroundColor: activeTab === 'withdrawals' ? primaryColor : surfaceLow }}
                   >
                     <Text className="font-bold" style={{ color: activeTab === 'withdrawals' ? 'white' : textColor }}>Withdrawals</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setActiveTab('support')}
                     className="flex-1 py-3 items-center rounded-xl"
                     style={{ backgroundColor: activeTab === 'support' ? primaryColor : surfaceLow }}
                   >
                     <Text className="font-bold" style={{ color: activeTab === 'support' ? 'white' : textColor }}>Customer Support</Text>
                   </TouchableOpacity>
                </View>

                {activeTab === 'users' ? (
                   <>
                     {/* Info Bar */}
                     <View className="px-5 mb-4 flex-row justify-between items-end">
                         <Text className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Users</Text>
                         <Text className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: primaryColor }}>
                             {users.length} Total
                         </Text>
                     </View>

                     {/* Search */}
                     <View className="px-5 mb-6">
                         <View className="flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: surfaceLow }}>
                             <Search size={18} color={subTextColor} />
                             <TextInput 
                                 className="flex-1 ml-3 font-medium text-base"
                                 style={{ color: textColor }}
                                 placeholder="Search by name, email, phone..."
                                 placeholderTextColor={subTextColor}
                                 value={searchQuery}
                                 onChangeText={setSearchQuery}
                             />
                         </View>
                     </View>

                     {/* User List */}
                     <FlatList 
                         data={filteredUsers}
                         keyExtractor={(item) => item.id}
                         renderItem={renderUser}
                         showsVerticalScrollIndicator={false}
                         contentContainerStyle={{ paddingBottom: 40 }}
                     />
                   </>
                ) : activeTab === 'withdrawals' ? (
                   <>
                     <View className="px-5 mb-4 flex-row justify-between items-end">
                         <Text className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Requests</Text>
                         <Text className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: primaryColor }}>
                             {withdrawals.length} Pending
                         </Text>
                     </View>
                     
                     {loadingWithdrawals ? (
                         <ActivityIndicator size="large" color={primaryColor} className="mt-10" />
                     ) : (
                         <FlatList 
                             data={withdrawals}
                             keyExtractor={(item) => item.id}
                             renderItem={renderWithdrawal}
                             showsVerticalScrollIndicator={false}
                             contentContainerStyle={{ paddingBottom: 40 }}
                             ListEmptyComponent={
                               <View className="items-center justify-center mt-10">
                                  <Text style={{ color: subTextColor }}>No pending withdrawals.</Text>
                               </View>
                             }
                         />
                     )}
                   </>
                ) : (
                   <>
                     <View className="px-5 mb-4 flex-row justify-between items-end">
                         <Text className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Support</Text>
                         <Text className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: primaryColor }}>
                             {supportRequests.length} Tickets
                         </Text>
                     </View>

                     {loadingSupport ? (
                         <ActivityIndicator size="large" color={primaryColor} className="mt-10" />
                     ) : (
                         <FlatList 
                             data={supportRequests}
                             keyExtractor={(item) => item.id}
                             renderItem={renderSupportRequest}
                             showsVerticalScrollIndicator={false}
                             contentContainerStyle={{ paddingBottom: 40 }}
                             ListEmptyComponent={
                               <View className="items-center justify-center mt-10">
                                  <Text style={{ color: subTextColor }}>No support tickets yet.</Text>
                               </View>
                             }
                         />
                     )}
                   </>
                )}
            </SafeAreaView>

            <Modal
                animationType="slide"
                transparent
                visible={!!selectedSupport}
                onRequestClose={() => setSelectedSupport(null)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/70 items-center justify-center p-5"
                    activeOpacity={1}
                    onPress={() => setSelectedSupport(null)}
                >
                    <View className="w-full rounded-[30px] p-5" style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}>
                        <Text className="text-xl font-black mb-3" style={{ color: textColor }}>Reply to Support Ticket</Text>
                        <Text className="text-sm mb-4" style={{ color: subTextColor }}>
                            Respond directly to the user and mark the ticket solved.
                        </Text>
                        <TextInput
                            value={replyMessage}
                            onChangeText={setReplyMessage}
                            placeholder="Enter your response"
                            placeholderTextColor={subTextColor}
                            multiline
                            className="rounded-3xl p-4 min-h-[140px] text-base"
                            style={{ backgroundColor: isDarkMode ? '#111827' : '#F7F8FD', color: textColor }}
                        />
                        <TouchableOpacity
                            onPress={handleSendSupportResponse}
                            disabled={responseProcessingId === selectedSupport?.id}
                            className="mt-4 rounded-2xl py-4 items-center"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {responseProcessingId === selectedSupport?.id ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold">Send Response</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenBackground>
    );
};

export default AdminPanelScreen;
