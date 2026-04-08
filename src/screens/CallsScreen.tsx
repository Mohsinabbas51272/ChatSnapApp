import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Call, initiateCall } from '../services/calls';
import { getContrastText, isLightColor } from '../services/colors';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../components/ui/ScreenBackground';

const CallsScreen = () => {
    const user = useSelector((state: RootState) => state.auth);
    const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<any>();

    const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
    const subTextColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const surfaceColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F2FA';

    useEffect(() => {
        if (!user.uid) return;

        // Fetch Outgoing Calls
        const outgoingQuery = query(
            collection(db, 'calls'),
            where('callerId', '==', user.uid)
        );

        // Fetch Incoming Calls
        const incomingQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid)
        );

        let outCalls: Call[] = [];
        let inCalls: Call[] = [];

        const updateCalls = () => {
            const merged = [...outCalls, ...inCalls].filter(c => c.timestamp);
            merged.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
            
            // Remove exact duplicates by ID just in case
            const uniqueCalls = merged.filter((call, index, self) => 
                index === self.findIndex((c) => c.id === call.id)
            );
            
            setCalls(uniqueCalls);
            setLoading(false);
        };

        const unsubOut = onSnapshot(outgoingQuery, (snap) => {
            outCalls = snap.docs.map(d => ({ id: d.id, ...d.data() } as Call));
            updateCalls();
        });

        const unsubIn = onSnapshot(incomingQuery, (snap) => {
            inCalls = snap.docs.map(d => ({ id: d.id, ...d.data() } as Call));
            updateCalls();
        });

        return () => {
            unsubOut();
            unsubIn();
        };
    }, [user.uid]);

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const d = timestamp.toDate();
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleCallAgain = async (callType: 'voice' | 'video', targetId: string, targetName: string) => {
        if (!user.uid) return;
        const callId = await initiateCall(user.uid, user.displayName || 'Someone', targetId, targetName, callType);
        if (callId) {
            navigation.navigate('Call', {
                callId,
                isIncoming: false,
                partnerName: targetName,
                partnerPhotoURL: null,
                type: callType
            });
        }
    };

    const renderCallItem = ({ item }: { item: Call }) => {
        const isOutgoing = item.callerId === user.uid;
        const targetName = isOutgoing ? (item.receiverName || "Unknown") : (item.callerName || "Unknown");
        const displayName = targetName;
        const initial = displayName.charAt(0).toUpperCase();

        let CallIcon = PhoneOutgoing;
        let iconColor = '#10B981'; // Green for ok
        
        if (item.status === 'missed' || item.status === 'rejected') {
            CallIcon = isOutgoing ? PhoneOutgoing : PhoneMissed;
            iconColor = '#EF4444'; // Red for missed/rejected
        } else if (!isOutgoing) {
            CallIcon = PhoneIncoming;
            iconColor = primaryColor; // Primary color for incoming answered
        }

        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                className="flex-row items-center p-4 mb-3 rounded-2xl"
                style={{ backgroundColor: surfaceColor }}
            >
                <View className="w-12 h-12 rounded-full items-center justify-center border-2 overflow-hidden mr-4" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}20` }}>
                    {/* Placeholder for Photo */}
                    <Text className="text-xl font-black" style={{ color: primaryColor }}>{initial}</Text>
                </View>

                <View className="flex-1">
                    <Text className="text-base font-black mb-1" style={{ color: textColor }}>{displayName}</Text>
                    <View className="flex-row items-center">
                        <CallIcon size={14} color={iconColor} strokeWidth={2.5} />
                        <Text className="text-xs ml-1 font-bold" style={{ color: subTextColor }}>
                            {item.type === 'video' ? 'Video Call' : 'Audio Call'} • {formatTime(item.timestamp)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={() => handleCallAgain(item.type, isOutgoing ? item.receiverId : item.callerId, displayName)}
                    className="w-10 h-10 rounded-full items-center justify-center ml-2"
                    style={{ backgroundColor: `${primaryColor}15` }}
                >
                    {item.type === 'video' ? (
                        <Video size={18} color={primaryColor} />
                    ) : (
                        <Phone size={18} color={primaryColor} />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 px-4 pt-4">
            <FlatList
                data={calls}
                keyExtractor={item => item.id}
                renderItem={renderCallItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    !loading ? (
                        <View className="flex-1 justify-center items-center mt-32">
                            <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Clock size={40} color={primaryColor} />
                            </View>
                            <Text className="text-2xl font-black mb-2" style={{ color: textColor }}>No Call History</Text>
                            <Text className="text-center px-8" style={{ color: subTextColor }}>
                                Your recent audio and video calls will appear here.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

export default CallsScreen;
