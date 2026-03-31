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
import { subscribeToFriendRequests } from '../services/social';
import Header from '../components/ui/Header';

const Tab = createBottomTabNavigator();

import ScreenBackground from '../components/ui/ScreenBackground';

const StoriesScreen = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeStories, setActiveStories] = useState<Story[] | null>(null);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
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

  const groupedStories = useMemo(() => {
    const groups: Map<string, GroupedStory> = new Map();
    stories.forEach(story => {
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
  }, [stories, user.uid]);

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
                setActiveStories(prev => {
                   if (!prev) return null;
                   const filtered = prev.filter(s => s.id !== storyId);
                   return filtered.length > 0 ? filtered : null;
                });
             } catch (e) {
                console.error(e);
                Alert.alert("Error", "Failed to delete story");
             } finally {
                loadStories();
                setIsPaused(false);
             }
          }
        }
      ]

    );
  };

  const handleReply = async (text: string, story: Story) => {
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
      Alert.alert("Reply Sent", "Your reply has been sent to " + story.displayName);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to send reply");
    }
  };

  return (
    <View className="flex-1">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStories} tintColor={primaryColor} />}
        showsVerticalScrollIndicator={false}
      >
        <StoryList 
          groupedStories={groupedStories} 
          currentUser={user} 
          onAddStory={() => setShowCamera(true)}
          onViewStory={(s, index) => {
            setActiveStories(s);
            setInitialStoryIndex(index);
          }}
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

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('Chats');
  const [requestCount, setRequestCount] = useState(0);
  const { primaryColor } = useSelector((state: RootState) => state.theme);
  const authUser = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();

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
              height: 65 + insets.bottom,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
              paddingTop: 12,
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
              bottom: 0,
              left: 0,
              right: 0,
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
