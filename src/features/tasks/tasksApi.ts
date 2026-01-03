import axios from "@/lib/axios";
import type { TaskResponse, CreateTaskRequest, UpdateTaskRequest } from "./types";

const TASKS_ENDPOINTS = {
  GET_ALL_TASKS: `/tasks`,
  GET_ALL_TASKS_BY_BOARDID: (groupId: string | number) =>
    `/tasks?board_id=${groupId}`,
  CREATE_TASK: `/tasks`,
  DELETE_TASK: `/tasks`,
  UPDATE_TASK: `/tasks`,
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
};
