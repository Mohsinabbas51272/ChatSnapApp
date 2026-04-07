import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  uid: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAuthenticated: boolean;
  isNewUser: boolean;
  loading: boolean;
  error: string | null;
  secretPassword?: string | null;
}

const initialState: UserState = {
  uid: null,
  phoneNumber: null,
  displayName: null,
  photoURL: null,
  isAuthenticated: false,
  isNewUser: false,
  loading: false,
  error: null,
  secretPassword: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUser: (state, action: PayloadAction<{ uid: string; phoneNumber: string | null; displayName?: string | null; photoURL?: string | null; isNewUser?: boolean; secretPassword?: string | null }>) => {
      state.uid = action.payload.uid;
      state.phoneNumber = action.payload.phoneNumber;
      state.displayName = action.payload.displayName || null;
      state.photoURL = action.payload.photoURL || null;
      state.isNewUser = action.payload.isNewUser || false;
      state.secretPassword = action.payload.secretPassword || null;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // Persist user to storage
      const userData = {
        uid: state.uid,
        phoneNumber: state.phoneNumber,
        displayName: state.displayName,
        photoURL: state.photoURL,
        isNewUser: state.isNewUser,
        secretPassword: state.secretPassword,
      };
      AsyncStorage.setItem('user', JSON.stringify(userData));
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.uid = null;
      state.phoneNumber = null;
      state.displayName = null;
      state.photoURL = null;
      state.isNewUser = false;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.secretPassword = null;
      AsyncStorage.removeItem('user');
    },
  },
});

export const { setLoading, setUser, setError, logout } = authSlice.actions;
export default authSlice.reducer;
