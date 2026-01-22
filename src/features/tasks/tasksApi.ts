import axios from "@/lib/axios";
import type {
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  EstimatedDateResponse,
  TaskComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  TimeEntriesResponse,
} from "./types";

const TASKS_ENDPOINTS = {
  GET_ALL_TASKS: `/tasks`,
  GET_ALL_TASKS_BY_BOARDID: (groupId: string | number) =>
    `/tasks?board_id=${groupId}`,
  GET_SINGLE_TASK: (taskId: string | number) => `/tasks/single?id=${taskId}`,
  CREATE_TASK: `/tasks`,
  DELETE_TASK: `/tasks`,
  UPDATE_TASK: `/tasks`,
  CREATE_ESTIMATED_DATE: `/tasks/estimate/date`,
  UPDATE_ESTIMATED_DATE: `/tasks/estimate/date`,
  ADD_TAG: `/tasks/tag`,
  REMOVE_TAG: (taskTagId: string | number) => `/tasks/tag/${taskTagId}`,
  GET_COMMENTS: (taskId: string | number) => `/tasks/${taskId}/comments`,
  CREATE_COMMENT: (taskId: string | number) => `/tasks/${taskId}/comments`,
  UPDATE_COMMENT: (taskId: string | number, commentId: string | number) => `/tasks/${taskId}/comments/${commentId}`,
  DELETE_COMMENT: (taskId: string | number, commentId: string | number) => `/tasks/${taskId}/comments/${commentId}`,
  START_TIMER: `/tasks/time/start`,
  STOP_TIMER: `/tasks/time/stop`,
};

export const tasksApi = {
  /**
   * Get all tasks for a board or group
   */
  getTasksByBoardId: async (
    boardId: string | number
  ): Promise<TaskResponse[]> => {
    try {
      const response = await axios.get<{ data: TaskResponse[] }>(
        TASKS_ENDPOINTS.GET_ALL_TASKS_BY_BOARDID(boardId)
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      throw error;
    }
  },

  getSingleTasks: async (boardId: string | number): Promise<TaskResponse> => {
    try {
      const response = await axios.get<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.GET_SINGLE_TASK(boardId)
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      throw error;
    }
  },

  // /**
  //  * Get a single task by ID
  //  */
  // getTask: async (taskId: string): Promise<Task> => {
  //   try {
  //     const response = await axios.get<{ data: Task }>(
  //       `${API_BASE_URL}/${taskId}`
  //     );
  //     return response.data.data;
  //   } catch (error) {
  //     console.error("Failed to fetch task:", error);
  //     throw error;
  //   }
  // },

  // /**
  //  * Create a new task
  //  */
  createTask: async (payload: CreateTaskRequest): Promise<TaskResponse> => {
    try {
      const response = await axios.post<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.CREATE_TASK,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  },

  // /**
  //  * Update an existing task
  //  */
  // updateTask: async (payload: UpdateTaskRequest): Promise<Task> => {
  //   try {
  //     const response = await axios.put<{ data: Task }>(API_BASE_URL, payload);
  //     return response.data.data;
  //   } catch (error) {
  //     console.error("Failed to update task:", error);
  //     throw error;
  //   }
  // },

  /**
   * Update an existing task
   */
  updateTask: async (payload: UpdateTaskRequest): Promise<TaskResponse> => {
    try {
      const response = await axios.put<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.UPDATE_TASK,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  },

  /**
   * Delete a task
   */
  deleteTask: async (taskId: string): Promise<void> => {
    try {
      await axios.delete(TASKS_ENDPOINTS.DELETE_TASK, {
        data: { id: taskId },
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  },

  /**
   * Create estimated date for a task
   */
  createEstimatedDate: async (payload: {
    task_id: string | number;
    estimated_date_from: string;
    estimated_date_to: string;
  }): Promise<EstimatedDateResponse> => {
    try {
      const response = await axios.post<{ data: EstimatedDateResponse }>(
        TASKS_ENDPOINTS.CREATE_ESTIMATED_DATE,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to create estimated date:", error);
      throw error;
    }
  },

  /**
   * Update estimated date for a task
   */
  updateEstimatedDate: async (payload: {
    task_id: string | number;
    estimated_date_from?: string;
    estimated_date_to?: string;
    approved_hours?: string | number | null;
  }): Promise<EstimatedDateResponse> => {
    try {
      const response = await axios.put<{ data: EstimatedDateResponse }>(
        TASKS_ENDPOINTS.UPDATE_ESTIMATED_DATE,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update estimated date:", error);
      throw error;
    }
  },

  /**
   * Update task tags via PUT endpoint
   * Sends tag ID to add/update tags for a task
   */
  updateTaskTags: async (payload: {
    id: string | number;
    tag_id: string | number;
  }): Promise<TaskResponse> => {
    try {
      const response = await axios.put<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.UPDATE_TASK,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update task tags:", error);
      throw error;
    }
  },

  /**
   * Add a tag to a task (legacy - use updateTaskTags instead)
   */
  addTag: async (payload: {
    task_id: string | number;
    tag_id: string | number;
  }): Promise<any> => {
    try {
      const response = await axios.post(
        TASKS_ENDPOINTS.ADD_TAG,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to add tag:", error);
      throw error;
    }
  },

  /**
   * Remove a tag from a task (legacy - use updateTaskTags instead)
   */
  removeTag: async (taskTagId: string | number): Promise<void> => {
    try {
      await axios.delete(TASKS_ENDPOINTS.REMOVE_TAG(taskTagId));
    } catch (error) {
      console.error("Failed to remove tag:", error);
      throw error;
    }
  },

  /**
   * Get all comments for a task
   */
  getComments: async (taskId: string | number): Promise<TaskComment[]> => {
    try {
      const response = await axios.get<any>(
        TASKS_ENDPOINTS.GET_COMMENTS(taskId)
      );

      let data = response.data;

      // If response is a string, it might contain HTML error messages before the JSON
      if (typeof data === "string") {
        const jsonStart = data.indexOf("{");
        if (jsonStart !== -1) {
          try {
            data = JSON.parse(data.substring(jsonStart));
          } catch (e) {
            console.error("Failed to parse JSON after stripping HTML:", e);
          }
        }
      }

      // Handle the API response format
      if (data && data.data && Array.isArray(data.data)) {
        return data.data;
      }

      // Fallback if response is array directly
      if (Array.isArray(data)) {
        return data;
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      throw error;
    }
  },

  /**
   * Create a new comment for a task
   */
  createComment: async (
    taskId: string | number,
    payload: CreateCommentRequest
  ): Promise<TaskComment> => {
    try {
      const response = await axios.post<{ data: TaskComment }>(
        TASKS_ENDPOINTS.CREATE_COMMENT(taskId),
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to create comment:", error);
      throw error;
    }
  },

  /**
   * Update an existing comment
   */
  updateComment: async (
    taskId: string | number,
    commentId: string | number,
    payload: UpdateCommentRequest
  ): Promise<TaskComment> => {
    try {
      const response = await axios.put<{ data: TaskComment }>(
        TASKS_ENDPOINTS.UPDATE_COMMENT(taskId, commentId),
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update comment:", error);
      throw error;
    }
  },

  /**
   * Delete a comment
   */
  deleteComment: async (
    taskId: string | number,
    commentId: string | number
  ): Promise<void> => {
    try {
      await axios.delete(TASKS_ENDPOINTS.DELETE_COMMENT(taskId, commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
      throw error;
    }
  },

  /**
   * Start timer for a task
   */
  startTimer: async (taskId: string | number): Promise<any> => {
    try {
      const response = await axios.post<any>(
        TASKS_ENDPOINTS.START_TIMER,
        { task_id: taskId }
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to start timer:", error);
      throw error;
    }
  },

  /**
   * Stop timer for a task
   */
  stopTimer: async (taskId: string | number): Promise<any> => {
    try {
      const response = await axios.post<any>(
        TASKS_ENDPOINTS.STOP_TIMER,
        { task_id: taskId }
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to stop timer:", error);
      throw error;
    }
  },

  /**
   * Get time entries for a task
   */
  getTimeEntries: async (taskId: string | number): Promise<TimeEntriesResponse["data"]> => {
    try {
      const response = await axios.get<TimeEntriesResponse>(
        `/tasks/time/entries?task_id=${taskId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
      throw error;
    }
  },
};
