import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, CircleDashed, Settings as SettingsIcon, Search, Camera, UserRound, ChevronLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchStories, uploadStory, deleteStory, Story, recordStoryView } from '../services/stories';
import { sendMessage } from '../services/messaging';
import { auth } from '../services/firebaseConfig';
import StoryList, { GroupedStory } from '../components/StoryList';
import SnapCameraScreen from '../components/SnapCameraScreen';
import SnapViewer from '../components/SnapViewer';
import ContactsScreen from './ContactsScreen';
import ConversationsList from '../components/ConversationsList';
import SettingsScreen from './SettingsScreen';
import { subscribeToFriendRequests, subscribeToFriends } from '../services/social';
import Header from '../components/ui/Header';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackScreenProps } from '../types/navigation';
import { isLightColor, getContrastText } from '../services/colors';

const Tab = createBottomTabNavigator();

import ScreenBackground from '../components/ui/ScreenBackground';

const StoriesScreen = () => {
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeStories, setActiveStories] = useState<Story[] | null>(null);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceLow = isDarkMode ? '#000000' : '#F0F2FA';
  const surfaceHigh = isDarkMode ? '#000000' : '#E8EAF6';
  const [friends, setFriends] = useState<string[]>([]);
  
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeToFriends(user.uid, (friendIds: string[]) => {
      setFriends(friendIds);
    });
    return unsub;
  }, [user.uid]);

  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStories();
      setStories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, []);

  const groupedStories = useMemo(() => {
    const groups: Map<string, GroupedStory> = new Map();
    
    // Only show stories from the current user OR active friends
    const filteredStories = stories.filter(
      story => String(story.userId) === String(user.uid) || friends.includes(String(story.userId))
    );

    filteredStories.forEach(story => {
      const uid = String(story.userId);
      if (!groups.has(uid)) {
         groups.set(uid, {
           userId: uid,
           displayName: story.displayName,
           stories: [],
           hasUnread: false
         });
      }
      const group = groups.get(uid)!;
      group.stories.push(story);
      const isRead = story.viewers?.some(v => String(v.userId) === String(user.uid)) || uid === String(user.uid);
      if (!isRead) group.hasUnread = true;
    });
    
    return Array.from(groups.values());
  }, [stories, user.uid, friends]);

  const handleAddStory = useCallback(async (uri: string, filter: string = 'none') => {
    setLoading(true);
    try {
      await uploadStory(user.uid || auth.currentUser?.uid || null, user.displayName || 'User', uri, filter);
    } catch (e) {
      Alert.alert("Nakam", "Story upload nahi ho saki: " + (e as any).message);
    } finally {
      loadStories();
    }
  }, [user.uid, user.displayName, loadStories]);

  const handleDeleteStory = useCallback((storyId: string) => {
    setIsPaused(true);
    Alert.alert(
      "Dobaara tayein",
      "Kya aap waqai is snap ko khatam karna chahte hain?",
      [
        { 
          text: "Choro", 
          style: "cancel",
          onPress: () => setIsPaused(false)
        },
        { 
          text: "Khatam", 
          style: "destructive",
          onPress: async () => {
             try {
                await deleteStory(storyId);
                setActiveStories(prev => {
                   if (!prev) return null;
                   const filtered = prev.filter(s => s.id !== storyId);
                   return filtered.length > 0 ? filtered : null;
                });
             } catch (e) {
                Alert.alert("Masla", "Story khatam nahi ho saki");
             } finally {
                loadStories();
                setIsPaused(false);
             }
          }
        }
      ]
    );
  }, [loadStories]);

  const handleReply = useCallback(async (text: string, story: Story) => {
    if (!user.uid || !story.id) return;
    try {
      await sendMessage(
        user.uid,
        story.userId,
        text,
        'text',
        undefined,
        undefined,
        undefined,
        {
          storyId: story.id,
          imageUri: story.imageUri,
          authorName: story.displayName
        }
      );
      Alert.alert("Bheja gaya", "Aapka jawab bheja gaya hai.");
    } catch (e) {
      Alert.alert("Masla", "Jawab bhejne mein masla hua.");
    }
  }, [user.uid]);

  return (
    <View className="flex-1">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStories} tintColor={primaryColor} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={getResponsiveContainerStyle()}>
          <StoryList 
            groupedStories={groupedStories} 
            currentUser={user} 
            onAddStory={() => setShowCamera(true)}
            onViewStory={(s, index) => {
              setActiveStories(s);
              setInitialStoryIndex(index);
            }}
          />
          
          <View 
            className="p-8 items-center justify-center mt-12 mx-6 rounded-3xl border"
            style={{ 
              backgroundColor: surfaceLow,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
          >
             <View className="p-4 rounded-full mb-4" style={{ backgroundColor: surfaceHigh }}>
                <Camera size={32} color={primaryColor} />
             </View>
            <Text className="text-center font-bold text-xl" style={{ color: textColor }}>
              Share Your Moments
            </Text>
            <Text className="text-center mt-2 leading-5" style={{ color: subTextColor }}>
              Your stories disappear in 24 hours. Keep your friends updated on your day!
            </Text>
            <TouchableOpacity 
              onPress={() => setShowCamera(true)}
              className="px-8 py-3 rounded-full mt-6"
              style={{ 
                backgroundColor: primaryColor,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Text className="font-bold" style={{ color: getContrastText(primaryColor) }}>Add to Story</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SnapCameraScreen 
        isVisible={showCamera}
        onClose={() => setShowCamera(false)}
        onSend={(uri: string, t: number, filter: string) => handleAddStory(uri, filter)}
      />

      {activeStories && (
        <SnapViewer 
          isVisible={!!activeStories}
          stories={activeStories}
          initialIndex={initialStoryIndex}
          duration={10}
          userId={user.uid || ''}
          onReply={(text, story) => handleReply(text, story)}
          onView={async (story) => {
             if (story.id && user.uid) {
               await recordStoryView(story.id, user.uid, user.displayName || 'Anonymous User');
             }
          }}
          onFinish={() => {
            setActiveStories(null);
            loadStories(); // Refresh to show new view count/viewers
          }}
          onDelete={(story) => {
            if (String(story.userId) === String(user.uid) || String(story.userId) === String(auth.currentUser?.uid)) {
              handleDeleteStory(story.id!);
            }
          }}
          isPaused={isPaused}
        />
      )}
    </View>
  );
};


const MemoizedStoriesScreen = React.memo(StoriesScreen);

const FOCUSED_ICON_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.2)',
  width: 44, height: 44, borderRadius: 22,
  alignItems: 'center' as const, justifyContent: 'center' as const,
};
const UNFOCUSED_ICON_STYLE = { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const };

import { getFocusedRouteNameFromRoute, useNavigation } from '@react-navigation/native';

const HomeScreen = ({ route, navigation }: RootStackScreenProps<'Home'>) => {
  const { isTablet, getResponsiveContainerStyle } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const activeTab = getFocusedRouteNameFromRoute(route) ?? 'Chats';
  const [requestCount, setRequestCount] = useState(0);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const authUser = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!authUser.uid) return;
    const unsub = subscribeToFriendRequests(authUser.uid, (requests) => {
      setRequestCount(requests.length);
    });
    return unsub;
  }, [authUser.uid]);

  const titles: Record<string, string> = {
    'Chats': 'ChatSnap',
    'Stories': 'Discover',
    'Contacts': 'Contacts',
    'Settings': 'Settings'
  };

  const navBg = isDarkMode ? '#000000' : primaryColor;
  const activeTint = isDarkMode ? '#FFFFFF' : getContrastText(primaryColor);
  const inactiveTint = isDarkMode ? 'rgba(255,255,255,0.4)' : (isLightColor(primaryColor) ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)');
  const iconOnNav = (focused: boolean) => focused ? activeTint : inactiveTint;
  const iconBgOnNav = (focused: boolean) => focused ? (isDarkMode ? 'rgba(255,255,255,0.2)' : (isLightColor(primaryColor) ? `${primaryColor}15` : 'rgba(255,255,255,0.1)')) : 'transparent';

  return (
    <ScreenBackground>
      <View className="flex-1">
        {showSearch ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }}>
            <View style={getResponsiveContainerStyle()} className="flex-row items-center px-4 py-3">
              <TouchableOpacity className="p-2 mr-2" onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                <ChevronLeft size={24} color={isDarkMode ? 'white' : '#1a1c1e'} />
              </TouchableOpacity>
              <View 
                className="flex-1 h-12 rounded-2xl flex-row items-center px-4" 
                style={{ backgroundColor: isDarkMode ? '#121212' : '#F0F2FA' }}
              >
                <Search size={20} color={isDarkMode ? 'white' : '#737580'} />
                <TextInput 
                  className="flex-1 ml-2 font-bold h-full"
                  style={{ color: isDarkMode ? 'white' : '#1a1c1e' }}
                  placeholder={`Search ${activeTab}...`}
                  placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.6)' : '#737580'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
            </View>
          </SafeAreaView>
        ) : (
          <Header 
            navigation={navigation}
            title={titles[activeTab] || 'ChatSnap'} 
            rightElement={
              <TouchableOpacity 
                onPress={() => setShowSearch(true)} 
                className="p-2 rounded-full" 
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}
              >
                <Search size={20} color={isDarkMode ? 'white' : '#1a1c1e'} />
              </TouchableOpacity>
            }
          />
        )}

        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarShowLabel: true,
            tabBarStyle: {
              height: (isTablet ? 100 : 75) + insets.bottom,
              paddingBottom: insets.bottom > 0 ? insets.bottom : (isTablet ? 25 : 12),
              paddingTop: 10,
              backgroundColor: navBg,
              borderTopWidth: 0,
              borderTopLeftRadius: isTablet ? 48 : 36,
              borderTopRightRadius: isTablet ? 48 : 36,
              elevation: 20,
              shadowColor: isDarkMode ? primaryColor : '#000',
              shadowOpacity: isDarkMode ? 0.4 : 0.15,
              shadowOffset: { width: 0, height: -6 },
              shadowRadius: 20,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
            tabBarActiveTintColor: activeTint,
            tabBarInactiveTintColor: inactiveTint,
            tabBarLabelStyle: {
              fontWeight: '900',
              fontSize: isTablet ? 14 : 10,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }
          }}
        >
          <Tab.Screen 
            name="Chats" 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={[focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE, { backgroundColor: iconBgOnNav(focused) }]}>
                  <MessageCircle size={22} color={iconOnNav(focused)} fill={focused && isDarkMode ? 'white' : 'transparent'} />
                </View>
              ),
            }}
          >
            {(props) => <ConversationsList {...props} searchQuery={searchQuery} />}
          </Tab.Screen>

          <Tab.Screen 
            name="Stories" 
            component={MemoizedStoriesScreen} 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={[focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE, { backgroundColor: iconBgOnNav(focused) }]}>
                  <CircleDashed size={22} color={iconOnNav(focused)} />
                </View>
              ),
            }}
          />

          <Tab.Screen 
            name="Contacts" 
            options={{
              tabBarBadge: requestCount > 0 ? requestCount : undefined,
              tabBarBadgeStyle: { 
                backgroundColor: '#FF3B30', 
                color: 'white', 
                fontSize: 10, 
                fontWeight: '900',
                marginTop: -4
               },
              tabBarIcon: ({ color, focused }) => (
                <View style={[focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE, { backgroundColor: iconBgOnNav(focused) }]}>
                  <Users size={22} color={iconOnNav(focused)} fill={focused && isDarkMode ? 'white' : 'transparent'} />
                </View>
              ),
            }}
          >
            {(props) => <ContactsScreen {...props} searchQuery={searchQuery} />}
          </Tab.Screen>

          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={[focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE, { backgroundColor: iconBgOnNav(focused) }]}>
                  <SettingsIcon size={22} color={iconOnNav(focused)} />
                </View>
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </ScreenBackground>
  );
};

export default HomeScreen;
