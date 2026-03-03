import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  isSaving: boolean;
  refreshCounter: number;
}

const initialState: UIState = {
  isSaving: false,
  refreshCounter: 0,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    },
    triggerRefresh: (state) => {
      state.refreshCounter += 1;
    },
  },
});

export const { setSaving, triggerRefresh } = uiSlice.actions;
export default uiSlice.reducer;
