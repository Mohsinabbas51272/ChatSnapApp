import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Search, ArrowLeft, Phone, Mail, CheckCircle, Clock } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { RootState } from '../store';
import ScreenBackground from '../components/ui/ScreenBackground';
import { getPendingWithdrawals, fulfillWithdrawal, AdminWithdrawal } from '../services/admin';

const AdminPanelScreen = () => {
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const [activeTab, setActiveTab] = useState<'users'|'withdrawals'>('users');
    
    // User Tab State
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    
    // Withdrawals Tab State
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

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
                ) : (
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
                )}
            </SafeAreaView>
        </ScreenBackground>
    );
};

export default AdminPanelScreen;
