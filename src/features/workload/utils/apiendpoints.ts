/**
 * API Endpoints registry for the application, grouped section-wise.
 * Defines query/mutation paths and HTTP methods where applicable.
 */

export interface EndpointConfig {
  path: string | ((...args: any[]) => string);
  method: "GET" | "POST" | "PUT" | "DELETE";
}

export const API_ENDPOINTS = {
  /**
   * AUTHENTICATION & SESSION MANAGEMENT
   */
  auth: {
    login: {
      path: "/loginup",
      method: "POST" as const
    },
    signup: {
      path: "/signup",
      method: "POST" as const
    },
    logout: {
      path: "/logout", // Note: frontend side clears token; endpoint defined for completeness
      method: "POST" as const
    },
    refresh: {
      path: "/refresh",
      method: "POST" as const
    },
    me: {
      path: "/me",
      method: "GET" as const
    },
    forgotPassword: {
      path: "/auth/forgot-password",
      method: "POST" as const
    },
    resetPassword: {
      path: "/auth/reset-password",
      method: "POST" as const
    },
    saveFcmToken: {
      path: "/save-token",
      method: "POST" as const
    },
    getOrganizations: {
      path: "/users/me/organizations",
      method: "GET" as const
    }
  },

  /**
   * USER PROFILE & PREFERENCES
   */
  user: {
    getMeta: {
      path: "/usermeta/me",
      method: "GET" as const
    },
    updateMeta: {
      path: "/usermeta/me",
      method: "PUT" as const
    },
    getEmailPreferences: {
      path: "/email-preferences",
      method: "GET" as const
    },
    updateEmailPreferences: {
      path: "/email-preferences",
      method: "PUT" as const
    }
  },

  /**
   * BOARDS AND ROLES
   */
  boards: {
    create: {
      path: "/boards",
      method: "POST" as const
    },
    getAll: {
      path: "/boards",
      method: "GET" as const
    },
    getById: {
      path: (id: string | number) => `/boards/${id}`,
      method: "GET" as const
    },
    update: {
      path: "/boards",
      method: "PUT" as const
    },
    delete: {
      path: "/boards",
      method: "DELETE" as const
    },
    clone: {
      path: "/boards/clone",
      method: "POST" as const
    },
    assignRole: {
      path: "/board-roles/assign",
      method: "POST" as const
    },
    assignMembers: {
      path: "/boards/assign-members",
      method: "POST" as const
    },
    removeMembers: {
      path: "/boards/assign-members",
      method: "DELETE" as const
    },
    assignClientGroups: {
      path: "/clients/assign-groups",
      method: "POST" as const
    },
    removeClientGroup: {
      path: (groupId: string | number, userId: string | number) => `/groups/${groupId}/clients/${userId}`,
      method: "DELETE" as const
    }
  },

  /**
   * TASK GROUPS
   */
  groups: {
    getAll: {
      path: "/groups",
      method: "GET" as const
    },
    getByBoard: {
      path: (boardId: string | number) => `/groups?board_id=${boardId}`,
      method: "GET" as const
    },
    create: {
      path: "/groups",
      method: "POST" as const
    },
    getById: {
      path: (id: string | number) => `/groups/${id}`,
      method: "GET" as const
    },
    update: {
      path: "/groups",
      method: "PUT" as const
    },
    delete: {
      path: "/groups",
      method: "DELETE" as const
    }
  },

  /**
   * TASKS, SUB-ITEMS, TIME TRACKING & COMMENTS
   */
  tasks: {
    getAll: {
      path: "/tasks",
      method: "GET" as const
    },
    getByBoard: {
      path: (boardId: string | number) => `/tasks?board_id=${boardId}`,
      method: "GET" as const
    },
    getSingle: {
      path: (taskId: string | number) => `/tasks/single?id=${taskId}`,
      method: "GET" as const
    },
    create: {
      path: "/tasks",
      method: "POST" as const
    },
    update: {
      path: "/tasks",
      method: "PUT" as const
    },
    delete: {
      path: "/tasks",
      method: "DELETE" as const
    },
    createEstimateDate: {
      path: "/tasks/estimate/date",
      method: "POST" as const
    },
    updateEstimateDate: {
      path: "/tasks/estimate/date",
      method: "PUT" as const
    },
    deleteEstimateDate: {
      path: "/tasks/estimate",
      method: "DELETE" as const
    },
    addTag: {
      path: "/tasks/tag",
      method: "POST" as const
    },
    removeTag: {
      path: (taskTagId: string | number) => `/tasks/tag/${taskTagId}`,
      method: "DELETE" as const
    },
    removeTaskTag: {
      path: "/task-tags",
      method: "DELETE" as const
    },
    getComments: {
      path: (taskId: string | number) => `/tasks/${taskId}/comments`,
      method: "GET" as const
    },
    createComment: {
      path: (taskId: string | number) => `/tasks/${taskId}/comments`,
      method: "POST" as const
    },
    updateComment: {
      path: (taskId: string | number, commentId: string | number) => `/tasks/${taskId}/comments/${commentId}`,
      method: "PUT" as const
    },
    deleteComment: {
      path: (taskId: string | number, commentId: string | number) => `/tasks/${taskId}/comments/${commentId}`,
      method: "DELETE" as const
    },
    likeComment: {
      path: (commentId: string | number) => `http://localhost/platform/wp-json/wp-platform/v1/comments/${commentId}/like`,
      method: "POST" as const
    },
    startTimer: {
      path: "/tasks/time/start",
      method: "POST" as const
    },
    stopTimer: {
      path: "/tasks/time/stop",
      method: "POST" as const
    },
    getActiveTimer: {
      path: "/tasks/time/active",
      method: "GET" as const
    },
    pingTimer: {
      path: "/tasks/time/ping",
      method: "POST" as const
    },
    getTimeEntries: {
      path: (taskId: string | number) => `/tasks/time/entries?task_id=${taskId}`,
      method: "GET" as const
    },
    addManualTimeEntry: {
      path: "/tasks/time/manual",
      method: "POST" as const
    },
    deleteTimeEntry: {
      path: (entryId: string | number) => `/tasks/time/entries/${entryId}`,
      method: "DELETE" as const
    },
    updateTimeEntry: {
      path: (entryId: string | number) => `/tasks/time/entries/${entryId}`,
      method: "PUT" as const
    },
    getActivity: {
      path: "/activity",
      method: "GET" as const
    },
    getBoardSops: {
      path: (boardId: string | number) => `/boards/${boardId}/sops`,
      method: "GET" as const
    },
    getClientComments: {
      path: (taskId: string | number) => `/tasks/${taskId}/comments/isclient`,
      method: "GET" as const
    },
    archive: {
      path: (taskId: string | number) => `/tasks/${taskId}/archive`,
      method: "PUT" as const
    }
  },

  /**
   * CMS DESIGN SYSTEM & CUSTOM FIELDS
   */
  cms: {
    getData: {
      path: "/cms",
      method: "POST" as const
    },
    createLabel: {
      path: "/labels",
      method: "POST" as const
    },
    updateLabel: {
      path: (labelId: string | number) => `/labels/${labelId}`,
      method: "PUT" as const
    },
    deleteLabel: {
      path: (labelId: string | number) => `/labels/${labelId}`,
      method: "DELETE" as const
    },
    createTag: {
      path: "/tags",
      method: "POST" as const
    },
    createStatus: {
      path: "/task-status",
      method: "POST" as const
    },
    updateStatus: {
      path: "/task-status",
      method: "PUT" as const
    },
    deleteStatus: {
      path: "/task-status",
      method: "DELETE" as const
    },
    reorderStatus: {
      path: "/task-status/reorder",
      method: "PUT" as const
    },
    createPriority: {
      path: "/task-priority",
      method: "POST" as const
    },
    updatePriority: {
      path: "/task-priority",
      method: "PUT" as const
    },
    deletePriority: {
      path: "/task-priority",
      method: "DELETE" as const
    },
    reorderPriority: {
      path: "/task-priority/reorder",
      method: "PUT" as const
    },
    userGroupColumns: {
      path: "/user-group-columns",
      method: "POST" as const
    }
  },

  /**
   * FILTERS CONFIGURATION
   */
  filters: {
    getByBoard: {
      path: (boardId: string | number) => `/task-filters/${boardId}`,
      method: "GET" as const
    },
    save: {
      path: (boardId: string | number) => `/task-filters/${boardId}`,
      method: "POST" as const
    },
    delete: {
      path: (boardId: string | number) => `/task-filters/${boardId}`,
      method: "DELETE" as const
    },
    getAll: {
      path: "/task-filters",
      method: "GET" as const
    }
  },

  /**
   * NOTIFICATIONS
   */
  notifications: {
    getAll: {
      path: (organizationId?: string | number) =>
        organizationId
          ? `/notifications/all?status=all&organization_id=${organizationId}`
          : "/notifications/all?status=all",
      method: "GET" as const
    },
    getUnread: {
      path: (organizationId?: string | number) =>
        organizationId
          ? `/notifications/all?status=unread&organization_id=${organizationId}`
          : "/notifications/all?status=unread",
      method: "GET" as const
    },
    markRead: {
      path: "/notifications/mark-read",
      method: "PUT" as const
    }
  },

  /**
   * ORGANIZATIONS
   */
  organization: {
    getMembers: {
      path: "/organization/members",
      method: "GET" as const
    }
  },

  /**
   * TRASH & ARCHIVE SYSTEM
   */
  trash: {
    get: {
      path: "/trash",
      method: "POST" as const
    },
    restoreTask: {
      path: "/trash/restore",
      method: "POST" as const
    },
    permanentDelete: {
      path: "/permanent-delete",
      method: "POST" as const
    },
    getArchivedTasks: {
      path: "/tasks/",
      method: "GET" as const
    }
  },

  /**
   * AWS S3 FILE UPLOADS
   */
  attachments: {
    getPresignedUrl: {
      path: "https://ukapxnx0ni.execute-api.ap-south-1.amazonaws.com/default/pm-upload-api",
      method: "GET" as const
    }
  }
};
