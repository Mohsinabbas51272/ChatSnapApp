import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, CircleDashed, Settings as SettingsIcon, Search, Camera, UserRound, ChevronLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchStories, uploadStory, deleteStory, Story } from '../services/stories';
import { auth } from '../services/firebaseConfig';
import StoryList from '../components/StoryList';
import SnapCameraScreen from '../components/SnapCameraScreen';
import SnapViewer from '../components/SnapViewer';
import ContactsScreen from './ContactsScreen';
import ConversationsList from '../components/ConversationsList';
import SettingsScreen from './SettingsScreen';
import { subscribeToFriendRequests } from '../services/social';
import Header from '../components/ui/Header';

const Tab = createBottomTabNavigator();

import ScreenBackground from '../components/ui/ScreenBackground';

const StoriesScreen = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor } = useSelector((state: RootState) => state.theme);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await fetchStories();
      setStories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleAddStory = async (uri: string, filter: string = 'none') => {
    setLoading(true);
    try {
      await uploadStory(user.uid || auth.currentUser?.uid || null, user.displayName || 'User', uri, filter);
    } catch (e) {
      console.error("Failed to upload story:", e);
      alert("Story upload failed: " + (e as any).message);
    } finally {
      loadStories();
    }
  };

  const handleDeleteStory = (storyId: string) => {
    setIsPaused(true);
    Alert.alert(
      "Delete Snap",
      "Are you sure you want to delete this snap?",
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => setIsPaused(false)
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
             try {
                await deleteStory(storyId);
             } catch (e) {
                console.error(e);
                Alert.alert("Error", "Failed to delete story");
             } finally {
                setActiveStory(null);
                loadStories();
                setIsPaused(false);
             }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStories} tintColor={primaryColor} />}
        showsVerticalScrollIndicator={false}
      >
        <StoryList 
          stories={stories} 
          currentUser={user} 
          onAddStory={() => setShowCamera(true)}
          onViewStory={(s) => setActiveStory(s)}
        />
        
        <View className="p-8 items-center justify-center mt-12 bg-surface-container-low mx-6 rounded-3xl border border-outline-variant/10">
           <View className="p-4 rounded-full mb-4" style={{ backgroundColor: '#222532' }}>
              <Camera size={32} color={primaryColor} />
           </View>
          <Text className="text-onSurface text-center font-bold text-xl">
            Share Your Moments
          </Text>
          <Text className="text-onSurface-variant text-center mt-2 leading-5">
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
            <Text className="font-bold text-white">Add to Story</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SnapCameraScreen 
        isVisible={showCamera}
        onClose={() => setShowCamera(false)}
        onSend={(uri: string, t: number, filter: string) => handleAddStory(uri, filter)}
      />

      {activeStory && (
        <SnapViewer 
          isVisible={!!activeStory}
          imageUri={activeStory.imageUri}
          duration={10}
          filter={(activeStory as any).filter}
          onFinish={() => setActiveStory(null)}
          onDelete={
            (String(activeStory.userId) === String(user.uid) || String(activeStory.userId) === String(auth.currentUser?.uid))
              ? () => handleDeleteStory(activeStory.id!)
              : undefined
          }
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

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('Chats');
  const [requestCount, setRequestCount] = useState(0);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const authUser = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!authUser.uid) return;
    const unsub = subscribeToFriendRequests(authUser.uid, (requests) => {
      setRequestCount(requests.length);
    });
    return unsub;
  }, [authUser.uid]);

  const MemoizedChats = useCallback(() => <ConversationsList searchQuery={searchQuery} />, [searchQuery]);
  const MemoizedContacts = useCallback(() => <ContactsScreen searchQuery={searchQuery} />, [searchQuery]);

  const titles: Record<string, string> = {
    'Chats': 'ChatSnap',
    'Stories': 'Discover',
    'Contacts': 'Contacts',
    'Settings': 'Settings'
  };

  return (
    <ScreenBackground>
      <View className="flex-1">
        {showSearch ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: primaryColor }}>
            <View className="flex-row items-center px-4 py-3">
              <TouchableOpacity className="p-2 mr-2" onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <View className="flex-1 bg-white/20 rounded-full flex-row items-center px-4 h-12">
                <Search size={20} color="white" />
                <TextInput 
                  className="flex-1 ml-2 text-white font-bold h-full"
                  placeholder={`Search ${activeTab}...`}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
            </View>
          </SafeAreaView>
        ) : (
          <Header 
            title={titles[activeTab] || 'ChatSnap'} 
            rightElement={
              <TouchableOpacity onPress={() => setShowSearch(true)} className="p-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Search size={20} color="white" />
              </TouchableOpacity>
            }
          />
        )}

        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              height: 85,
              paddingBottom: 25,
              paddingTop: 10,
              backgroundColor: primaryColor,
              borderTopWidth: 0,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              elevation: 10,
              shadowColor: primaryColor,
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: -4 },
              shadowRadius: 16,
              position: 'absolute',
            },
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
            tabBarLabelStyle: {
              fontWeight: 'bold',
              fontSize: 11,
            }
          }}
          screenListeners={{
            state: (e) => {
              const routeName = (e.data as any).state.routes[(e.data as any).state.index].name;
              setActiveTab(routeName);
            },
          }}
        >
          <Tab.Screen 
            name="Chats" 
            children={MemoizedChats}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE}>
                  <MessageCircle size={22} color="white" fill={focused ? 'white' : 'transparent'} />
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Stories" 
            component={MemoizedStoriesScreen} 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE}>
                  <CircleDashed size={22} color="white" />
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Contacts" 
            children={MemoizedContacts}
            options={{
              tabBarBadge: requestCount > 0 ? requestCount : undefined,
              tabBarBadgeStyle: { backgroundColor: '#ff6e85', color: 'white', fontSize: 10 },
              tabBarIcon: ({ color, focused }) => (
                <View style={focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE}>
                  <Users size={22} color="white" />
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={focused ? FOCUSED_ICON_STYLE : UNFOCUSED_ICON_STYLE}>
                  <SettingsIcon size={22} color="white" />
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
