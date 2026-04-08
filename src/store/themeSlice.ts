import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeState {
  primaryColor: string;
  themeName: string;
  mood: string;
  isDarkMode: boolean;
  chatWallpaper?: string | null;
  chatWallpaperOpacity: number;
}

const initialState: ThemeState = {
  primaryColor: '#FFFFFF', // Pure White Default
  themeName: 'Pure White',
  mood: 'Chill',
  isDarkMode: false,
  chatWallpaper: null,
  chatWallpaperOpacity: 0.2,
};

const moodMap: { [key: string]: { color: string; name: string } } = {
  'Happy': { color: '#e966ff', name: 'Radiant Tertiary' },
  'Chill': { color: '#9ba8ff', name: 'Electric Intimacy' },
  'Love': { color: '#ff6e85', name: 'Pulse Pink' },
  'Zen': { color: '#778aff', name: 'Soft Primary' },
  'Deep': { color: '#c500e6', name: 'Deep Violet' },
  'Fire': { color: '#4963ff', name: 'Core Blue' },
  'White': { color: '#FFFFFF', name: 'Pure White' },
};

// Persist theme to AsyncStorage
const persistTheme = (state: ThemeState) => {
  AsyncStorage.setItem('theme', JSON.stringify({
    primaryColor: state.primaryColor,
    themeName: state.themeName,
    mood: state.mood,
    isDarkMode: state.isDarkMode,
    chatWallpaper: state.chatWallpaper,
    chatWallpaperOpacity: state.chatWallpaperOpacity,
  })).catch(() => {});
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<{ primaryColor: string; themeName: string }>) => {
      state.primaryColor = action.payload.primaryColor;
      state.themeName = action.payload.themeName;
      persistTheme(state);
    },
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
      persistTheme(state);
    },
    setMood: (state, action: PayloadAction<string>) => {
      const moodInfo = moodMap[action.payload];
      if (moodInfo) {
        state.mood = action.payload;
        state.primaryColor = moodInfo.color;
        state.themeName = moodInfo.name;
        persistTheme(state);
      }
    },
    restoreTheme: (state, action: PayloadAction<any>) => {
      state.primaryColor = action.payload.primaryColor;
      state.themeName = action.payload.themeName;
      state.mood = action.payload.mood;
      state.isDarkMode = action.payload.isDarkMode || false;
      state.chatWallpaper = action.payload.chatWallpaper || null;
      state.chatWallpaperOpacity = action.payload.chatWallpaperOpacity ?? 0.2;
    },
    setChatWallpaper: (state, action: PayloadAction<{ uri: string | null; opacity?: number }>) => {
      state.chatWallpaper = action.payload.uri;
      if (action.payload.opacity !== undefined) {
        state.chatWallpaperOpacity = action.payload.opacity;
      }
      persistTheme(state);
    },
    setWallpaperOpacity: (state, action: PayloadAction<number>) => {
      state.chatWallpaperOpacity = action.payload;
      persistTheme(state);
    },
  },
});

export const { setTheme, setMood, restoreTheme, toggleDarkMode, setChatWallpaper, setWallpaperOpacity } = themeSlice.actions;
export default themeSlice.reducer;

