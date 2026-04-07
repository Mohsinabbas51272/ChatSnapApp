import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Search, ArrowLeft, MoreVertical, Phone, Mail } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { RootState } from '../store';
import ScreenBackground from '../components/ui/ScreenBackground';

const AdminPanelScreen = () => {
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const navigation = useNavigation<any>();

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const surfaceLow = isDarkMode ? '#000000' : '#FFFFFF';
    const surfaceHigh = isDarkMode ? '#1a1c1e' : '#F0F2FA';

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

                {/* Info Bar */}
                <View className="px-5 mb-4">
                    <Text className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>User Database</Text>
                    <Text className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: primaryColor }}>
                        {users.length} Total Registered
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
            </SafeAreaView>
        </ScreenBackground>
    );
};

export default AdminPanelScreen;
