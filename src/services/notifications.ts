import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Detect if we are running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
const shouldDisableNotifications = isExpoGo && Platform.OS === 'android';

// Configure notification handler (only if supported)
if (!shouldDisableNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} else {
  console.log('Push notifications are disabled in Expo Go on Android (Removed in SDK 53)');
}

// Request permissions
export const requestNotificationPermissions = async () => {
  if (shouldDisableNotifications) return true; // Pretend it's granted to avoid alerts

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // alert('Failed to get push token for push notification!');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
};

// Get push token
export const getPushToken = async () => {
  if (shouldDisableNotifications) return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({
       projectId: Constants.expoConfig?.extra?.eas?.projectId // Important for standalone builds
    });
    return token.data;
  } catch (error) {
    console.warn('Error getting push token:', error);
    return null;
  }
};

// Send remote push notification via Expo API
export const sendPushNotification = async (targetUid: string, title: string, body: string, data?: any) => {
  if (!targetUid) return;

  try {
    // 1. Get the target user's push token from Firestore
    const userSnap = await getDoc(doc(db, 'users', targetUid));
    if (!userSnap.exists()) return;

    const { pushToken, settings } = userSnap.data();
    
    // Check if user has push notifications enabled in their settings (optional check)
    if (settings?.notifications === false) return;
    if (!pushToken) return;

    // 2. Send the push notification via Expo Push API
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      _displayInForeground: true, // Show alert even if app is open
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Send local notification
export const sendLocalNotification = async (title: string, body: string, data?: any) => {
  if (shouldDisableNotifications) {
     console.log('Local Notification (Skipped):', title, body);
     return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null, // Send immediately
  });
};

// Handle incoming notifications when app is foreground
export const setupNotificationListeners = (
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) => {
  if (shouldDisableNotifications) {
    return () => {};
  }
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};