import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { fetchWalletData, fetchTransactions } from '../store/earnSlice';
import { requestWithdrawal, MIN_WITHDRAWAL } from '../services/earn';
import ScreenBackground from '../components/ui/ScreenBackground';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';

const WalletScreen = ({ navigation }: any) => {
  const { getResponsiveContainerStyle } = useResponsive();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth);
  const { isDarkMode, primaryColor } = useSelector((state: RootState) => state.theme);
  const { wallet, transactions, loading } = useSelector((state: RootState) => state.earn);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Fetch transactions on screen focus so it refreshes status
  useFocusEffect(
    useCallback(() => {
      if (user.uid) {
        dispatch(fetchWalletData(user.uid as string));
        dispatch(fetchTransactions(user.uid as string));
      }
    }, [user.uid, dispatch])
  );

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDarkMode ? '#1A1C24' : '#FFFFFF';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const handleWithdraw = async () => {
    if (!user.uid) return;
    const amountNum = parseInt(withdrawAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (amountNum < MIN_WITHDRAWAL) {
      Alert.alert('Threshold Not Met', `Minimum withdrawal is ${MIN_WITHDRAWAL} coins (${MIN_WITHDRAWAL / 30} PKR).`);
      return;
    }
    if (amountNum > (wallet?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your current balance.');
      return;
    }
    if (accountDetails.trim().length < 5) {
      Alert.alert('Details Required', 'Please provide valid account details (e.g. Easypaisa / JazzCash number).');
      return;
    }

    setWithdrawing(true);
    const result = await requestWithdrawal(user.uid as string, amountNum, 'Manual details', accountDetails);
    
    if (result.success) {
      Alert.alert('Success', result.message);
      setWithdrawAmount('');
      setAccountDetails('');
      dispatch(fetchWalletData(user.uid as string));
      dispatch(fetchTransactions(user.uid as string));
    } else {
      Alert.alert('Failed', result.message);
    }
    setWithdrawing(false);
  };

  const renderTransaction = (tx: any) => {
    const isEarn = tx.type === 'earn';
    const amountColor = isEarn ? '#34C759' : '#FF3B30';
    let dateStr = 'Unknown';
    try {
        if (tx.timestamp) {
           const d = new Date(tx.timestamp);
           const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
           dateStr = d.toLocaleDateString('en-US', options);
        }
    } catch(e) {}

    return (
      <View key={tx.id} className="flex-row items-center justify-between p-4 mb-3 rounded-2xl" style={{ backgroundColor: inputBg }}>
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: isEarn ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }}>
            {isEarn ? <ArrowDownLeft size={20} color="#34C759" /> : <ArrowUpRight size={20} color="#FF3B30" />}
          </View>
          <View>
            <Text className="font-bold text-base" style={{ color: textColor }}>
                {tx.source || (isEarn ? 'Earned' : 'Withdrawal')}
                {!isEarn && tx.status && (
                   <Text style={{ color: tx.status === 'completed' ? '#34C759' : '#FF9500', fontSize: 12 }}>
                      {' '} ({tx.status})
                   </Text>
                )}
            </Text>
            <Text className="text-xs mt-1" style={{ color: subTextColor }}>{dateStr}</Text>
          </View>
        </View>
        <Text className="font-bold text-lg" style={{ color: amountColor }}>
           {isEarn ? '+' : ''}{tx.amount}
        </Text>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeft size={24} color={textColor} />
          </TouchableOpacity>
          <Text className="font-bold text-lg" style={{ color: textColor }}>Wallet</Text>
          <View className="w-8" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={getResponsiveContainerStyle()} className="px-5 mt-2">
            
            <View className="items-center py-6">
               <Text className="text-sm font-medium uppercase tracking-widest" style={{ color: subTextColor }}>Available Balance</Text>
               <Text className="text-5xl font-heavy mt-2" style={{ color: textColor }}>{wallet?.balance || 0} <Text className="text-2xl text-[#FFD700]">🪙</Text></Text>
               <View className="mt-2 py-1 px-3 rounded-full" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}>
                  <Text className="font-bold text-[#34C759]">Est. PKR: {((wallet?.balance || 0) / 30).toFixed(2)}</Text>
               </View>
            </View>

            {/* Withdrawal Section */}
            <View className="mt-2 rounded-3xl p-5" style={{ backgroundColor: cardBg }}>
               <Text className="font-bold text-lg mb-4" style={{ color: textColor }}>Withdraw Funds</Text>
               
               <Text className="text-sm font-medium mb-2 ml-1" style={{ color: subTextColor }}>Amount to Withdraw (Min {MIN_WITHDRAWAL})</Text>
               <TextInput 
                  className="rounded-2xl px-4 py-3 h-14 font-bold text-lg mb-4"
                  style={{ backgroundColor: inputBg, color: textColor }}
                  placeholder={`e.g. ${MIN_WITHDRAWAL}`}
                  placeholderTextColor={subTextColor}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
               />

               <Text className="text-sm font-medium mb-2 ml-1" style={{ color: subTextColor }}>Account Details (Easypaisa/JazzCash etc)</Text>
               <TextInput 
                  className="rounded-2xl px-4 py-3 min-h-[56px] text-base mb-6"
                  style={{ backgroundColor: inputBg, color: textColor }}
                  placeholder="Enter details here..."
                  placeholderTextColor={subTextColor}
                  multiline
                  value={accountDetails}
                  onChangeText={setAccountDetails}
               />

               <TouchableOpacity 
                 onPress={handleWithdraw}
                 disabled={withdrawing}
                 className="flex-row justify-center items-center h-14 rounded-full"
                 style={{ backgroundColor: primaryColor }}
               >
                 {withdrawing ? (
                    <ActivityIndicator color={getContrastText(primaryColor)} />
                 ) : (
                    <>
                       <Send size={20} color={getContrastText(primaryColor)} />
                       <Text className="ml-2 font-bold text-base" style={{ color: getContrastText(primaryColor) }}>Submit Request</Text>
                    </>
                 )}
               </TouchableOpacity>
            </View>

            {/* Transaction History */}
            <View className="mt-8 mb-4 flex-row items-center">
               <History size={20} color={textColor} />
               <Text className="ml-2 font-bold text-xl" style={{ color: textColor }}>Recent Transactions</Text>
            </View>

            {loading && transactions.length === 0 ? (
               <ActivityIndicator color={primaryColor} className="mt-4" />
            ) : transactions.length > 0 ? (
               transactions.map(renderTransaction)
            ) : (
               <View className="items-center justify-center py-10">
                  <Text style={{ color: subTextColor }}>No transactions yet.</Text>
               </View>
            )}

          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

export default WalletScreen;
