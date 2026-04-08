import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Gift, PlaySquare, CalendarCheck, ArrowRight, Share2, Wallet } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { fetchWalletData, fetchTransactions } from '../store/earnSlice';
import { addCoins, DAILY_LIMIT, MONTHLY_LIMIT } from '../services/earn';
import ScreenBackground from '../components/ui/ScreenBackground';
import { useResponsive } from '../hooks/useResponsive';
import { isLightColor, getContrastText } from '../services/colors';
import LuckySpinner from '../components/LuckySpinner';

const EarnScreen = ({ navigation }: any) => {
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth);
  const { isDarkMode, primaryColor } = useSelector((state: RootState) => state.theme);
  const { wallet, loading } = useSelector((state: RootState) => state.earn);

  const [claiming, setClaiming] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user.uid) {
        dispatch(fetchWalletData(user.uid));
        dispatch(fetchTransactions(user.uid));
      }
    }, [user.uid, dispatch])
  );

  const handleClaim = async (taskId: string, amount: number, source: string) => {
    if (!user.uid) return;
    setClaiming(taskId);
    
    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const result = await addCoins(user.uid, amount, source);
    if (result.success) {
      Alert.alert('Success', result.message);
      dispatch(fetchWalletData(user.uid));
      dispatch(fetchTransactions(user.uid));
    } else {
      Alert.alert('Failed', result.message);
    }
    setClaiming(null);
  };

  const handleShare = async () => {
    try {
      if (!user.uid) return;
      await Share.share({
        message: `ChatSnap pe aao mere sath! Is link se signup karo aur 150 coins hasil karo: https://chatsnap.app/invite/${user.uid}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isLoginClaimed = wallet?.lastLoginDate === today;
  const isAdClaimed = wallet?.lastAdDate === today;

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDarkMode ? '#1A1C24' : '#FFFFFF';
  const progressBg = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const dailyPercent = wallet ? Math.min((wallet.dailyCoinsEarned / DAILY_LIMIT) * 100, 100) : 0;
  const monthlyPercent = wallet ? Math.min(((wallet.monthlyCoinsEarned || 0) / MONTHLY_LIMIT) * 100, 100) : 0;

  return (
    <ScreenBackground>
      <View className="flex-1">
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={getResponsiveContainerStyle()} className="px-4">
            
            {/* Wallet Summary Card */}
            <View 
              className="mt-6 rounded-3xl p-6 shadow-sm overflow-hidden relative"
              style={{ backgroundColor: primaryColor }}
            >
              {/* Decorative background circle */}
              <View 
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20"
                style={{ backgroundColor: getContrastText(primaryColor) }}
              />
              
              <Text className="text-sm font-medium mb-1" style={{ color: getContrastText(primaryColor) }}>
                Total Balance
              </Text>
              <View className="flex-row items-center">
                <Coins size={36} color="#FFD700" fill="#FFC107" />
                <Text className="text-4xl font-heavy ml-2 tracking-tight" style={{ color: getContrastText(primaryColor) }}>
                  {wallet?.balance || 0}
                </Text>
              </View>

              <TouchableOpacity 
                className="mt-6 flex-row items-center justify-between rounded-2xl py-3 px-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onPress={() => navigation.navigate('Wallet')}
              >
                <View className="flex-row items-center">
                  <Wallet size={20} color={getContrastText(primaryColor)} />
                  <Text className="ml-2 font-bold" style={{ color: getContrastText(primaryColor) }}>Withdraw Coins</Text>
                </View>
                <ArrowRight size={20} color={getContrastText(primaryColor)} />
              </TouchableOpacity>
            </View>

            {/* Monthly Progress */}
            <View className="mt-6 rounded-3xl p-5" style={{ backgroundColor: cardBg }}>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-bold text-lg" style={{ color: textColor }}>Monthly Progress</Text>
                <Text className="font-medium text-sm" style={{ color: subTextColor }}>
                  {wallet?.monthlyCoinsEarned || 0} / {MONTHLY_LIMIT} Coins
                </Text>
              </View>
              <View className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: progressBg }}>
                <View 
                  className="h-full rounded-full" 
                  style={{ 
                    backgroundColor: '#AF52DE', 
                    width: `${monthlyPercent}%` 
                  }} 
                />
              </View>
              <Text className="mt-2 text-xs font-bold" style={{ color: subTextColor }}>
                30 PKR ≈ 900 Coins
              </Text>
              
              {/* Daily Progress */}
              <View className="flex-row justify-between items-center mt-5 mb-2">
                <Text className="font-bold text-sm" style={{ color: textColor }}>Daily Limit</Text>
                <Text className="font-medium text-xs" style={{ color: subTextColor }}>
                  {wallet?.dailyCoinsEarned || 0} / {DAILY_LIMIT} Coins
                </Text>
              </View>
              <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: progressBg }}>
                <View 
                  className="h-full rounded-full" 
                  style={{ 
                    backgroundColor: primaryColor, 
                    width: `${dailyPercent}%` 
                  }} 
                />
              </View>
            </View>

            {/* Lucky Spinner Section */}
            <Text className="ml-2 mt-8 mb-4 font-heavy text-xl uppercase tracking-wider" style={{ color: textColor }}>
              Lucky Spin
            </Text>
            <LuckySpinner onRewardClaimed={() => {
              if (user.uid) {
                dispatch(fetchWalletData(user.uid));
                dispatch(fetchTransactions(user.uid));
              }
            }} />

            {/* Tasks Section */}
            <Text className="ml-2 mt-4 mb-4 font-heavy text-xl uppercase tracking-wider" style={{ color: textColor }}>
              Daily Tasks
            </Text>

            {/* Task 1: Daily Login */}
            <TouchableOpacity 
              className="mb-4 rounded-3xl p-5 flex-row items-center"
              style={{ backgroundColor: cardBg, opacity: isLoginClaimed ? 0.6 : 1 }}
              onPress={() => !isLoginClaimed && handleClaim('login', 10, 'Daily Login')}
              disabled={claiming === 'login' || isLoginClaimed}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: isLoginClaimed ? 'rgba(0,0,0,0.05)' : 'rgba(52, 199, 89, 0.15)' }}>
                <CalendarCheck size={24} color={isLoginClaimed ? subTextColor : "#34C759"} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg" style={{ color: isLoginClaimed ? subTextColor : textColor }}>Daily Check-in</Text>
                <Text className="text-sm mt-1" style={{ color: subTextColor }}>+10 Coins</Text>
              </View>
              {claiming === 'login' ? (
                <ActivityIndicator color={primaryColor} />
              ) : (
                <View className="rounded-full px-4 py-2" style={{ backgroundColor: isLoginClaimed ? progressBg : primaryColor }}>
                  <Text className="font-bold text-xs" style={{ color: isLoginClaimed ? subTextColor : getContrastText(primaryColor) }}>
                    {isLoginClaimed ? 'Claimed' : 'Claim'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Task 2: Watch Ad */}
            <TouchableOpacity 
              className="mb-4 rounded-3xl p-5 flex-row items-center"
              style={{ backgroundColor: cardBg, opacity: isAdClaimed ? 0.6 : 1 }}
              onPress={() => !isAdClaimed && handleClaim('ad', 10, 'Watched Video Ad')}
              disabled={claiming === 'ad' || isAdClaimed}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: isAdClaimed ? 'rgba(0,0,0,0.05)' : 'rgba(0, 122, 255, 0.15)' }}>
                <PlaySquare size={24} color={isAdClaimed ? subTextColor : "#007AFF"} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg" style={{ color: isAdClaimed ? subTextColor : textColor }}>Watch a Video Ad</Text>
                <Text className="text-sm mt-1" style={{ color: subTextColor }}>+10 Coins</Text>
              </View>
              {claiming === 'ad' ? (
                <ActivityIndicator color={primaryColor} />
              ) : (
                <View className="rounded-full px-4 py-2" style={{ backgroundColor: isAdClaimed ? progressBg : primaryColor }}>
                  <Text className="font-bold text-xs" style={{ color: isAdClaimed ? subTextColor : getContrastText(primaryColor) }}>
                    {isAdClaimed ? 'Done' : 'Watch'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Referral Section */}
            <Text className="ml-2 mt-6 mb-4 font-heavy text-xl uppercase tracking-wider" style={{ color: textColor }}>
              Invite Friends
            </Text>
            
            <View className="mb-6 rounded-3xl p-5 border" style={{ backgroundColor: cardBg, borderColor: progressBg }}>
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(255, 149, 0, 0.15)' }}>
                  <Gift size={20} color="#FF9500" />
                </View>
                <Text className="font-bold text-lg flex-1" style={{ color: textColor }}>Refer & Earn</Text>
              </View>
              <Text className="text-sm mb-4 leading-5" style={{ color: subTextColor }}>
                Invite your friends to ChatSnap and get 30 coins for every successful signup using your referral link!
              </Text>
              <TouchableOpacity onPress={handleShare} className="flex-row items-center justify-center py-3 rounded-2xl" style={{ backgroundColor: progressBg }}>
                <Share2 size={18} color={primaryColor} />
                <Text className="font-bold ml-2" style={{ color: primaryColor }}>Share Invite Link</Text>
              </TouchableOpacity>
            </View>

            {/* Referral Stats */}
            <View className="mb-10 flex-row space-x-4">
               <View className="flex-1 rounded-3xl p-5" style={{ backgroundColor: cardBg }}>
                  <Text className="text-[10px] font-bold mb-1" style={{ color: subTextColor, opacity: 0.6 }}>TOTAL REFERRALS</Text>
                  <Text className="text-2xl font-black" style={{ color: textColor }}>{user.referralCount || 0}</Text>
               </View>
               <View className="flex-1 rounded-3xl p-5" style={{ backgroundColor: cardBg }}>
                  <Text className="text-[10px] font-bold mb-1" style={{ color: subTextColor, opacity: 0.6 }}>EARNED COINS</Text>
                  <Text className="text-2xl font-black" style={{ color: '#FF9500' }}>{(user.referralCount || 0) * 30}</Text>
               </View>
            </View>

          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
};

export default EarnScreen;
