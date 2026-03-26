import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../services/messaging';

interface OfflineState {
  queue: Omit<Message, 'id' | 'timestamp' | 'viewed'>[];
}

const initialState: OfflineState = {
  queue: [],
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    addToQueue: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp' | 'viewed'>>) => {
      state.queue.push(action.payload);
    },
    removeFromQueue: (state, action: PayloadAction<number>) => {
      state.queue.splice(action.payload, 1);
    },
    clearQueue: (state) => {
      state.queue = [];
    },
  },
});

export const { addToQueue, removeFromQueue, clearQueue } = offlineSlice.actions;
export default offlineSlice.reducer;
