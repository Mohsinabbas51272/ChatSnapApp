import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import offlineReducer from './offlineSlice';
import themeReducer from './themeSlice';
import earnReducer from './earnSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    offline: offlineReducer,
    theme: themeReducer,
    earn: earnReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Firestore timestamps and other non-serializable values
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['offline.queue'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
