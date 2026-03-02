import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import boardsReducer from "@/features/boards/boardsSlice";
import tasksReducer from "@/features/tasks/tasksSlice";
import uiReducer, { setSaving } from "@/features/ui/uiSlice";
import { setLoadingListener } from "@/lib/axios";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    boards: boardsReducer,
    tasks: tasksReducer,
    ui: uiReducer,
  },
});

// Subscribe to global axios loading state
setLoadingListener((isLoading) => {
  store.dispatch(setSaving(isLoading));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
