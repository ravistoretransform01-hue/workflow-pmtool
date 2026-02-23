import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { tasksApi } from "./tasksApi";

interface TasksState {
  activeTimerId: string | null;
  timerStartTime: number | null;
  status: "idle" | "loading" | "succeeded" | "failed";
}

export const fetchActiveTimer = createAsyncThunk(
  "tasks/fetchActiveTimer",
  async () => {
    const activeTimer = await tasksApi.getActiveTimer();
    return activeTimer;
  },
);

const initialState: TasksState = {
  activeTimerId: sessionStorage.getItem("activeTimerId"),
  timerStartTime: sessionStorage.getItem("timerStartTime")
    ? Number(sessionStorage.getItem("timerStartTime"))
    : null,
  status: "idle",
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    startTimer: (state, action: PayloadAction<string>) => {
      const now = Date.now();
      state.activeTimerId = action.payload;
      state.timerStartTime = now;
      sessionStorage.setItem("activeTimerId", action.payload);
      sessionStorage.setItem("timerStartTime", String(now));
    },
    stopTimer: (state) => {
      state.activeTimerId = null;
      state.timerStartTime = null;
      sessionStorage.removeItem("activeTimerId");
      sessionStorage.removeItem("timerStartTime");
    },
    setActiveTimerId: (state, action: PayloadAction<string | null>) => {
      state.activeTimerId = action.payload;
      if (action.payload) {
        const now = state.timerStartTime || Date.now();
        state.timerStartTime = now;
        sessionStorage.setItem("activeTimerId", action.payload);
        sessionStorage.setItem("timerStartTime", String(now));
      } else {
        state.timerStartTime = null;
        sessionStorage.removeItem("activeTimerId");
        sessionStorage.removeItem("timerStartTime");
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveTimer.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchActiveTimer.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload) {
          state.activeTimerId = action.payload.task_id;
          // Calculate local start timestamp relative to current time using server's elapsed_seconds
          // This avoids clock skew issues between client and server
          const localStartTime = Date.now() - (action.payload.elapsed_seconds * 1000);
          state.timerStartTime = localStartTime;
          sessionStorage.setItem("activeTimerId", action.payload.task_id);
          sessionStorage.setItem("timerStartTime", String(localStartTime));
        } else {
          // If no active timer on backend, we should also clear local storage
          // to stay in sync (e.g. after a crash where backend timed out)
          state.activeTimerId = null;
          state.timerStartTime = null;
          sessionStorage.removeItem("activeTimerId");
          sessionStorage.removeItem("timerStartTime");
        }
      })
      .addCase(fetchActiveTimer.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export const { startTimer, stopTimer, setActiveTimerId } = tasksSlice.actions;
export default tasksSlice.reducer;
