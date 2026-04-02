import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeState {
  primaryColor: string;
  themeName: string;
  mood: string;
  isDarkMode: boolean;
}

const initialState: ThemeState = {
  primaryColor: '#9ba8ff', // Electric Intimacy Primary
  themeName: 'Electric Intimacy',
  mood: 'Chill',
  isDarkMode: true,
};

const moodMap: { [key: string]: { color: string; name: string } } = {
  'Happy': { color: '#e966ff', name: 'Radiant Tertiary' },
  'Chill': { color: '#9ba8ff', name: 'Electric Intimacy' },
  'Love': { color: '#ff6e85', name: 'Pulse Pink' },
  'Zen': { color: '#778aff', name: 'Soft Primary' },
  'Deep': { color: '#c500e6', name: 'Deep Violet' },
  'Fire': { color: '#4963ff', name: 'Core Blue' },
};

// Persist theme to AsyncStorage
const persistTheme = (state: ThemeState) => {
  AsyncStorage.setItem('theme', JSON.stringify({
    primaryColor: state.primaryColor,
    themeName: state.themeName,
    mood: state.mood,
    isDarkMode: state.isDarkMode,
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
    restoreTheme: (state, action: PayloadAction<ThemeState>) => {
      state.primaryColor = action.payload.primaryColor;
      state.themeName = action.payload.themeName;
      state.mood = action.payload.mood;
      state.isDarkMode = action.payload.isDarkMode || false;
    },
  },
});

export const { setTheme, setMood, restoreTheme, toggleDarkMode } = themeSlice.actions;
export default themeSlice.reducer;

