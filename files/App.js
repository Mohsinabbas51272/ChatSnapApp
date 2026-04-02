import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen, RegisterScreen } from './screens/AuthScreens';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import UsersScreen from './screens/UsersScreen';

const Stack = createNativeStackNavigator();

// ✅ Auth guard — redirects based on login state
const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // ✅ Logged in screens
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerShown: true, headerTintColor: '#6C63FF' }}
          />
          <Stack.Screen
            name="Users"
            component={UsersScreen}
            options={{
              headerShown: true,
              title: 'Naya Chat',
              headerTintColor: '#6C63FF',
            }}
          />
        </>
      ) : (
        // ✅ Auth screens — no anonymous login option
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    // ✅ NavigationContainer is outermost — navigation context always available
    // ✅ AuthProvider inside so useNavigation() works everywhere including AuthContext
    <NavigationContainer>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
