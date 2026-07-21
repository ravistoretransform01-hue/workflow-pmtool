import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/services/authSlice";
import boardsReducer from "@/features/boards/services/boardsSlice";
import tasksReducer from "@/features/tasks/services/tasksSlice";
import uiReducer, { setSaving } from "@/features/ui/services/uiSlice";
import { setLoadingListener } from "@/config/axios";

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
