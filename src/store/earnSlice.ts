import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getWalletData, getTransactions, initializeWallet, WalletData, Transaction } from '../services/earn';

interface EarnState {
  wallet: WalletData | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const initialState: EarnState = {
  wallet: null,
  transactions: [],
  loading: false,
  error: null,
};

export const fetchWalletData = createAsyncThunk(
  'earn/fetchWalletData',
  async (uid: string, { rejectWithValue }) => {
    try {
      let data = await getWalletData(uid);
      if (!data) {
         data = await initializeWallet(uid);
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'earn/fetchTransactions',
  async (uid: string, { rejectWithValue }) => {
    try {
      const data = await getTransactions(uid);
      // Serialize timestamps
      const serializedData = data.map(t => ({
         ...t,
         timestamp: t.timestamp ? (t.timestamp.toDate ? t.timestamp.toDate().toISOString() : t.timestamp) : new Date().toISOString()
      }));
      return serializedData as any;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const earnSlice = createSlice({
  name: 'earn',
  initialState,
  reducers: {
     clearEarnData: (state) => {
        state.wallet = null;
        state.transactions = [];
        state.error = null;
     }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletData.fulfilled, (state, action) => {
        state.loading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWalletData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEarnData } = earnSlice.actions;
export default earnSlice.reducer;
