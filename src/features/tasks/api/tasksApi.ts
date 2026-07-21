import axios from "@/config/axios";
import type {
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  EstimatedDateResponse,
  TaskComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  TimeEntriesResponse,
  BoardSOP,
  BoardSOPResponse,
} from "@/features/tasks/types/types";

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
  DELETE_ESTIMATED_DATE: `/tasks/estimate`,
  ADD_TAG: `/tasks/tag`,
  REMOVE_TAG: (taskTagId: string | number) => `/tasks/tag/${taskTagId}`,
  REMOVE_TASK_TAG: `/task-tags`,  
  GET_COMMENTS: (taskId: string | number) => `/tasks/${taskId}/comments`,
  CREATE_COMMENT: (taskId: string | number) => `/tasks/${taskId}/comments`,
  UPDATE_COMMENT: (taskId: string | number, commentId: string | number) =>
    `/tasks/${taskId}/comments/${commentId}`,
  DELETE_COMMENT: (taskId: string | number, commentId: string | number) =>
    `/tasks/${taskId}/comments/${commentId}`,
  LIKE_COMMENT: (commentId: string | number) => `/comments/${commentId}/like`,
  START_TIMER: `/tasks/time/start`,
  STOP_TIMER: `/tasks/time/stop`,
  GET_ACTIVE_TIMER: `/tasks/time/active`,
  PING_TIMER: `/tasks/time/ping`,
  GET_TIME_ENTRIES: `/tasks/time/entries`,
  ADD_MANUAL_TIME_ENTRY: `/tasks/time/manual`,
  GET_ACTIVITY: `/activity`,
  GET_BOARD_SOPS: (boardId: string | number) => `/boards/${boardId}/sops`,
  GET_CLIENT_COMMENTS: (taskId: string | number) =>
    `/tasks/${taskId}/comments/isclient`,
  ARCHIVE_TASK: (taskId: string | number) => `/tasks/${taskId}/archive`,
};

const checkIfCurrentUserIsClient = (): boolean => {
  try {
    const match = window.location.pathname.match(/\/board\/(\d+)/);
    const boardId = match ? match[1] : null;
    if (!boardId) return false;

    const userDataRaw = localStorage.getItem("user_data");
    if (!userDataRaw) return false;
    const userData = JSON.parse(userDataRaw);
    const currentUserId = userData?.user_id;
    if (!currentUserId) return false;

    const cached = localStorage.getItem(`cms_data_board_${boardId}`);
    if (!cached) return false;

    const cmsData = JSON.parse(cached);
    const members = cmsData?.members;
    if (!Array.isArray(members)) return false;

    const currentMember = members.find(
      (m: any) => String(m.user_id) === String(currentUserId)
    );
    const roleLabel = currentMember?.board_role_label;
    return !!(roleLabel && roleLabel.toLowerCase().includes("client"));
  } catch (error) {
    console.error("Error checking client role:", error);
    return false;
  }
};

export const tasksApi = {
  /**
   * Get all tasks for a board or group
   */
  getTasksByBoardId: async (
    boardId: string | number,
    organizationId?: number | null,
  ): Promise<TaskResponse[]> => {
    try {
      const response = await axios.get<{ data: TaskResponse[] }>(
        TASKS_ENDPOINTS.GET_ALL_TASKS_BY_BOARDID(boardId),
        {
          params: { organization_id: organizationId },
        },
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      throw error;
    }
  },

  getSingleTasks: async (
    taskId: string | number,
    organizationId?: number | null,
  ): Promise<TaskResponse> => {
    try {
      const response = await axios.get<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.GET_SINGLE_TASK(taskId),
        {
          params: { organization_id: organizationId },
        },
      );
      return response.data.data as any;
    } catch (error) {
      console.error("Failed to fetch task:", error);
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
        payload,
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
        payload,
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
        payload,
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
        payload,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update estimated date:", error);
      throw error;
    }
  },

  /**
   * Update estimated date for a task
   */
  deleteEstimatedDate: async (payload: {
    task_id: string | number;
  }): Promise<EstimatedDateResponse> => {
    try {
      const response = await axios.delete<{ data: EstimatedDateResponse }>(
        TASKS_ENDPOINTS.DELETE_ESTIMATED_DATE,
        { data: payload },
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to delete estimated date:", error);
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
        payload,
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
      const response = await axios.post(TASKS_ENDPOINTS.ADD_TAG, payload);
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
   * Remove a tag from a task using the dedicated task-tags endpoint
   */
  removeTaskTag: async (taskTagId: string | number): Promise<void> => {
    try {
      await axios.delete(TASKS_ENDPOINTS.REMOVE_TASK_TAG, {
        data: { id: taskTagId },
      });
    } catch (error) {
      console.error("Failed to remove task tag:", error);
      throw error;
    }
  },

  /**
   * Get all comments for a task
   */
  getComments: async (
    taskId: string | number,
    params?: {
      mode?: "flat" | "threaded";
      page?: number;
      per_page?: number;
    },
  ): Promise<any> => {
    try {
      const response = await axios.get<any>(
        TASKS_ENDPOINTS.GET_COMMENTS(taskId),
        { params },
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
        const mappedData = data.data.map((comment: any) => {
          const descendants: any[] = [];
          const collectDescendants = (c: any) => {
            if (Array.isArray(c.children)) {
              c.children.forEach((child: any) => {
                const mappedChild = {
                  ...child,
                  sop: child.sop === "1" || child.sop === 1,
                  children: [],
                };
                descendants.push(mappedChild);
                collectDescendants(child);
              });
            }
          };

          collectDescendants(comment);

          // Sort descendants by created_at ascending (oldest first)
          descendants.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

          return {
            ...comment,
            sop: comment.sop === "1" || comment.sop === 1,
            children: descendants,
          };
        });

        if (params?.mode === "threaded") {
          return {
            data: mappedData,
            meta: data.meta,
          };
        }
        return mappedData;
      }

      // Fallback if response is array directly
      if (Array.isArray(data)) {
        return data.map((comment: any) => ({
          ...comment,
          sop: comment.sop === "1" || comment.sop === 1,
          children: [],
        }));
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      throw error;
    }
  },

  getClientComments: async (
    taskId: string | number,
    params?: {
      mode?: "flat" | "threaded";
      page?: number;
      per_page?: number;
    },
  ): Promise<any> => {
    try {
      const { data } = await axios.get<any>(
        TASKS_ENDPOINTS.GET_CLIENT_COMMENTS(taskId),
        { params },
      );

      // Handle the API response format
      if (data && data.data && Array.isArray(data.data)) {
        const mappedData = data.data.map((comment: any) => {
          const descendants: any[] = [];
          const collectDescendants = (c: any) => {
            if (Array.isArray(c.children)) {
              c.children.forEach((child: any) => {
                const mappedChild = {
                  ...child,
                  sop: child.sop === "1" || child.sop === 1,
                  children: [],
                };
                descendants.push(mappedChild);
                collectDescendants(child);
              });
            }
          };

          collectDescendants(comment);

          // Sort descendants by created_at ascending (oldest first)
          descendants.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

          return {
            ...comment,
            sop: comment.sop === "1" || comment.sop === 1,
            children: descendants,
          };
        });

        if (params?.mode === "threaded") {
          return {
            data: mappedData,
            meta: data.meta,
          };
        }
        return mappedData;
      }

      // Fallback if response is array directly
      if (Array.isArray(data)) {
        return data.map((comment: any) => ({
          ...comment,
          sop: comment.sop === "1" || comment.sop === 1,
          children: [],
        }));
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch client comments:", error);
      throw error;
    }
  },

  /**
   * Create a new comment for a task
   */
  createComment: async (
    taskId: string | number,
    payload: CreateCommentRequest,
  ): Promise<TaskComment> => {
    try {
      const isClient = checkIfCurrentUserIsClient();
      const finalPayload = (isClient || payload.isclient === 1 || payload.isclient === true)
        ? { ...payload, isclient: 1 }
        : payload;

      const response = await axios.post<{ data: TaskComment }>(
        TASKS_ENDPOINTS.CREATE_COMMENT(taskId),
        finalPayload,
      );
      const comment = response.data.data as any;
      return {
        ...comment,
        sop: comment.sop === "1" || comment.sop === 1,
      };
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
    payload: UpdateCommentRequest,
  ): Promise<TaskComment> => {
    try {
      const isClient = checkIfCurrentUserIsClient();
      const finalPayload = (isClient || payload.isclient === 1 || payload.isclient === true)
        ? { ...payload, isclient: 1 }
        : payload;

      const response = await axios.put<{ data: TaskComment }>(
        TASKS_ENDPOINTS.UPDATE_COMMENT(taskId, commentId),
        finalPayload,
      );
      const comment = response.data.data as any;
      return {
        ...comment,
        sop: comment.sop === "1" || comment.sop === 1,
      };
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
    commentId: string | number,
  ): Promise<void> => {
    try {
      await axios.delete(TASKS_ENDPOINTS.DELETE_COMMENT(taskId, commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
      throw error;
    }
  },

  /**
   * Like or unlike a comment
   */
  likeComment: async (
    commentId: string | number,
  ): Promise<{
    comment_id: number | string;
    action: "liked" | "unliked";
    is_liked_by_me: boolean;
    total_likes: number;
  }> => {
    try {
      const response = await axios.post<{
        data: {
          comment_id: number;
          action: string;
          is_liked_by_me: boolean;
          total_likes: number;
        };
      }>(TASKS_ENDPOINTS.LIKE_COMMENT(commentId));
      return response.data.data as any;
    } catch (error) {
      console.error("Failed to like comment:", error);
      throw error;
    }
  },

  /**
   * Start timer for a task
   */
  startTimer: async (taskId: string | number): Promise<any> => {
    try {
      const response = await axios.post<any>(TASKS_ENDPOINTS.START_TIMER, {
        task_id: taskId,
      });
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
      const response = await axios.post<any>(TASKS_ENDPOINTS.STOP_TIMER, {
        task_id: taskId,
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to stop timer:", error);
      throw error;
    }
  },

  /**
   * Get the current user's active timer
   */
  getActiveTimer: async (
    organizationId?: number | null,
  ): Promise<{
    timer_id: string;
    task_id: string;
    start_time: string;
    elapsed_seconds: number;
    is_running: boolean;
  } | null> => {
    try {
      const response = await axios.get<any>(TASKS_ENDPOINTS.GET_ACTIVE_TIMER, {
        params: { organization_id: organizationId },
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch active timer:", error);
      throw error;
    }
  },

  /**
   * Heartbeat to keep timer alive
   */
  pingTimer: async (): Promise<any> => {
    try {
      const response = await axios.post<any>(TASKS_ENDPOINTS.PING_TIMER);
      return response.data;
    } catch (error) {
      console.error("Failed to ping timer:", error);
      throw error;
    }
  },

  /**
   * Get time entries for a task
   */
  getTimeEntries: async (
    taskId: string | number,
  ): Promise<TimeEntriesResponse["data"]> => {
    try {
      const response = await axios.get<TimeEntriesResponse>(
        `/tasks/time/entries?task_id=${taskId}`,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
      throw error;
    }
  },

  /**
   * Add a manual time entry for a task
   */
  addManualTimeEntry: async (payload: {
    task_id: string | number;
    start_time: string;
    end_time: string;
    note?: string;
  }): Promise<any> => {
    try {
      const response = await axios.post<any>(
        TASKS_ENDPOINTS.ADD_MANUAL_TIME_ENTRY,
        payload,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to add manual time entry:", error);
      throw error;
    }
  },

  /**
   * Delete a time entry
   */
  deleteTimeEntry: async (entryId: string | number): Promise<any> => {
    try {
      const response = await axios.delete(`/tasks/time/entries/${entryId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      throw error;
    }
  },

  /**
   * Update an existing time entry
   */
  updateTimeEntry: async (
    entryId: string | number,
    payload: {
      start_time: string;
      end_time: string;
      note?: string;
    },
  ): Promise<any> => {
    try {
      const response = await axios.put<any>(
        `/tasks/time/entries/${entryId}`,
        payload,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update time entry:", error);
      throw error;
    }
  },

  /**
   * Get activity log for a task
   */
  getActivity: async (params: {
    organization_id: number;
    user_id?: number;
    task_id: string | number;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: Array<{
      id: string;
      organization_id: string;
      board_id: string;
      task_id: string;
      user_id: string;
      action: string;
      old_value: string | null;
      new_value: string;
      created_at: string;
      user?: {
        id: number;
        name: string;
        email: string;
        avatar_url?: string;
      };
      sop?: boolean;
      old_value_parsed: any;
      new_value_parsed: any;
      action_label: string;
    }>;
    meta: {
      total: number;
      count: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams({
        organization_id: params.organization_id.toString(),
        // user_id: params.user_id?.toString() ?? "",
        task_id: params.task_id.toString(),
        page: (params.page || 1).toString(),
        per_page: (params.per_page || 50).toString(),
      });

      const response = await axios.get<any>(
        `${TASKS_ENDPOINTS.GET_ACTIVITY}?${queryParams}`,
      );

      return response.data;
    } catch (error) {
      console.error("Failed to fetch activity:", error);
      throw error;
    }
  },
  /**
   * Toggle SOP status for a comment using the update API
   */
  toggleSOP: async (
    taskId: string | number,
    commentId: string | number,
    sop: boolean,
  ): Promise<{
    id: number | string;
    sop: boolean;
  }> => {
    try {
      const response = await axios.put<{
        data: {
          id: number;
          sop: string | number;
        };
      }>(TASKS_ENDPOINTS.UPDATE_COMMENT(taskId, commentId), {
        sop: sop ? 1 : 0,
      });
      const data = response.data.data;
      return {
        id: data.id,
        sop: data.sop === "1" || data.sop === 1,
      };
    } catch (error) {
      console.error("Failed to toggle SOP:", error);
      throw error;
    }
  },

  /**
   * Toggle isclient status for a comment using the update API
   */
  toggleIsClient: async (
    taskId: string | number,
    commentId: string | number,
    isclient: boolean,
  ): Promise<{
    id: number | string;
    isclient: boolean;
  }> => {
    try {
      const response = await axios.put<{
        data: {
          id: number;
          isclient: string | number;
        };
      }>(TASKS_ENDPOINTS.UPDATE_COMMENT(taskId, commentId), {
        isclient: isclient ? 1 : 0,
      });
      const data = response.data.data;
      return {
        id: data.id,
        isclient: data.isclient === "1" || data.isclient === 1,
      };
    } catch (error) {
      console.error("Failed to toggle isclient:", error);
      throw error;
    }
  },

  /**
   * Get all SOPs for a board
   */
  getBoardSOPs: async (boardId: string | number): Promise<BoardSOP[]> => {
    try {
      const response = await axios.get<BoardSOPResponse>(
        TASKS_ENDPOINTS.GET_BOARD_SOPS(boardId),
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch board SOPs:", error);
      throw error;
    }
  },

  /**
   * Update task position for reordering
   */
  updateTaskPosition: async (payload: {
    id: string | number;
    position: string;
  }): Promise<TaskResponse> => {
    try {
      const response = await axios.put<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.UPDATE_TASK,
        payload,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update task position:", error);
      throw error;
    }
  },

  /**
   * Update the status of a task via the standard update endpoint
   */
  updateTaskStatus: async (payload: {
    taskId: string | number;
    status_id: number;
    board_id: number;
  }): Promise<TaskResponse> => {
    try {
      const response = await axios.put<{ data: TaskResponse }>(
        TASKS_ENDPOINTS.UPDATE_TASK,
        {
          id: payload.taskId,
          status_id: payload.status_id,
          board_id: payload.board_id,
        },
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update task status:", error);
      throw error;
    }
  },

  /**
   * Archive or unarchive a task
   */
  archiveTask: async (
    taskId: string | number,
    isArchived: boolean,
  ): Promise<{ id: number; is_archived: boolean }> => {
    try {
      const response = await axios.put<{
        data: { id: number; is_archived: boolean };
      }>(TASKS_ENDPOINTS.ARCHIVE_TASK(taskId), {
        is_archived: isArchived ? 1 : 0,
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to archive task:", error);
      throw error;
    }
  },
};
