import axios from "@/lib/axios";
import type {
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  EstimatedDateResponse,
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
   * Sends array of tag IDs to add/update tags for a task
   */
  updateTaskTags: async (payload: {
    id: string | number;
    tag_id: (string | number)[];
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
};
