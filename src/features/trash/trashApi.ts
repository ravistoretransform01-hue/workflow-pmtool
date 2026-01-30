import api from "@/lib/axios";

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

export interface TrashResponse {
  boards: any[];
  groups: any[];
  tasks: TrashTask[];
  statuses: any[];
  priorities: any[];
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

  deleteTaskPermanently: async (
    taskId: string,
    organizationId: number,
  ): Promise<void> => {
    await api.post("/permanent-delete", {
      id: taskId,
      organization_id: organizationId,
      item_type: "task",
    });
  },
};
