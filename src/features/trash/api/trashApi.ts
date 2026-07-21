import api from "@/config/axios";

export interface TrashTask {
  id: string;
  name: string;
  deleted_at: string;
  group_id: string;
  board_id: string;
  status_id: string;
  task_priority_id: string;
  board_name: string;
  group_name: string;
  status_name: string;
  priority_name: string;
  creator_name: string;
  // description: string;
  // created_by: string;
}

export interface TrashBoard {
  id: string;
  name: string;
  deleted_at: string;
}

export interface TrashGroup {
  id: string;
  name: string;
  board_id: string;
  deleted_at: string;
  board_name: string;
}

export interface TrashStatus {
  id: string;
  name: string;
  board_id: string;
  color_code: string;
  deleted_at: string;
  board_name: string;
}

export interface TrashPriority {
  id: string;
  name: string;
  board_id: string;
  color_code: string;
  deleted_at: string;
  board_name: string;
}

export interface TrashResponse {
  boards: TrashBoard[];
  groups: TrashGroup[];
  tasks: TrashTask[];
  statuses: TrashStatus[];
  priorities: TrashPriority[];
}

export const trashApi = {
  getTrash: async (organizationId: number): Promise<TrashResponse> => {
    const response = await api.post<TrashResponse>("/trash", {
      organization_id: organizationId,
    });
    return response.data;
  },

  restoreTask: async (
    taskId: string,
    organizationId: number,
  ): Promise<void> => {
    await api.post("/trash/restore", {
      task_id: taskId,
      organization_id: organizationId,
    });
  },

  deletePermanently: async (
    id: string,
    organizationId: number,
    itemType: "task" | "board" | "group" | "status" | "priority",
  ): Promise<void> => {
    await api.post("/permanent-delete", {
      id: id,
      organization_id: organizationId,
      item_type: itemType,
    });
  },

  getArchivedTasks: async (
    organizationId: number,
    boardId?: number | string,
  ): Promise<TrashTask[]> => {
    const response = await api.get<{ data: TrashTask[] }>(`/tasks/`, {
      params: { 
        organization_id: organizationId,
        show_archived: 1,
        board_id: boardId,
      },
    });
    return response.data.data || [];
  },
};
