import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { tasksApi } from "./tasksApi";

interface TasksState {
  activeTimerId: string | null;
  timerStartTime: number | null;
  activeTaskInfo: {
    name: string;
    trackedTimeSeconds: number;
  } | null;
  status: "idle" | "loading" | "succeeded" | "failed";
}

export const fetchActiveTimer = createAsyncThunk(
  "tasks/fetchActiveTimer",
  async () => {
    const activeTimer = await tasksApi.getActiveTimer();
    if (activeTimer) {
      try {
        const task = await tasksApi.getSingleTasks(activeTimer.task_id);
        return {
          ...activeTimer,
          taskName: task.name,
          trackedTimeSeconds: task.tracked_time_seconds,
        };
      } catch (error) {
        console.error("Failed to fetch task details for active timer:", error);
        return activeTimer;
      }
    }
    return activeTimer;
  },
);

const initialState: TasksState = {
  activeTimerId: sessionStorage.getItem("activeTimerId"),
  timerStartTime: sessionStorage.getItem("timerStartTime")
    ? Number(sessionStorage.getItem("timerStartTime"))
    : null,
  activeTaskInfo: sessionStorage.getItem("activeTaskInfo")
    ? JSON.parse(sessionStorage.getItem("activeTaskInfo")!)
    : null,
  status: "idle",
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    startTimer: (
      state,
      action: PayloadAction<{
        taskId: string;
        taskName: string;
        trackedTimeSeconds: number;
      }>,
    ) => {
      const now = Date.now();
      state.activeTimerId = action.payload.taskId;
      state.timerStartTime = now;
      state.activeTaskInfo = {
        name: action.payload.taskName,
        trackedTimeSeconds: action.payload.trackedTimeSeconds,
      };
      sessionStorage.setItem("activeTimerId", action.payload.taskId);
      sessionStorage.setItem("timerStartTime", String(now));
      sessionStorage.setItem(
        "activeTaskInfo",
        JSON.stringify(state.activeTaskInfo),
      );
    },
    stopTimer: (state) => {
      state.activeTimerId = null;
      state.timerStartTime = null;
      state.activeTaskInfo = null;
      sessionStorage.removeItem("activeTimerId");
      sessionStorage.removeItem("timerStartTime");
      sessionStorage.removeItem("activeTaskInfo");
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
        state.activeTaskInfo = null;
        sessionStorage.removeItem("activeTimerId");
        sessionStorage.removeItem("timerStartTime");
        sessionStorage.removeItem("activeTaskInfo");
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
          const localStartTime =
            Date.now() - action.payload.elapsed_seconds * 1000;
          state.timerStartTime = localStartTime;

          const payload = action.payload as any;
          if (payload && payload.taskName) {
            state.activeTaskInfo = {
              name: payload.taskName,
              trackedTimeSeconds: payload.trackedTimeSeconds,
            };
            sessionStorage.setItem(
              "activeTaskInfo",
              JSON.stringify(state.activeTaskInfo),
            );
          }

          sessionStorage.setItem("activeTimerId", action.payload.task_id);
          sessionStorage.setItem("timerStartTime", String(localStartTime));
        } else {
          // If no active timer on backend, we should also clear local storage
          // to stay in sync (e.g. after a crash where backend timed out)
          state.activeTimerId = null;
          state.timerStartTime = null;
          state.activeTaskInfo = null;
          sessionStorage.removeItem("activeTimerId");
          sessionStorage.removeItem("timerStartTime");
          sessionStorage.removeItem("activeTaskInfo");
        }
      })
      .addCase(fetchActiveTimer.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export const { startTimer, stopTimer, setActiveTimerId } = tasksSlice.actions;
export default tasksSlice.reducer;
