import { useState, useCallback } from "react";
import type { Task } from "@/features/workload/types/workload-types";

/**
 * Hook for managing task-related UI state
 * Handles: expanded tasks, checked tasks, inline editing
 * Reusable across all views (Table, Kanban, Calendar, etc.)
 */
export function useTaskState() {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState<string | null>(null);
  const [inlineEditingTaskName, setInlineEditingTaskName] = useState("");

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }, []);

  const expandTask = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: true,
    }));
  }, []);

  const collapseTask = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: false,
    }));
  }, []);

  const toggleTaskCheck = useCallback((taskId: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }, []);

  const checkTask = useCallback((taskId: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: true,
    }));
  }, []);

  const uncheckTask = useCallback((taskId: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: false,
    }));
  }, []);

  const clearCheckedTasks = useCallback(() => {
    setCheckedTasks({});
  }, []);

  const startInlineEdit = useCallback((taskId: string, taskName: string) => {
    setInlineEditingTaskId(taskId);
    setInlineEditingTaskName(taskName);
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setInlineEditingTaskId(null);
    setInlineEditingTaskName("");
  }, []);

  const finishInlineEdit = useCallback(() => {
    setInlineEditingTaskId(null);
    setInlineEditingTaskName("");
  }, []);

  return {
    // State
    expandedTasks,
    checkedTasks,
    editingTask,
    inlineEditingTaskId,
    inlineEditingTaskName,

    // Setters
    setExpandedTasks,
    setCheckedTasks,
    setEditingTask,
    setInlineEditingTaskId,
    setInlineEditingTaskName,

    // Task expansion
    toggleTask,
    expandTask,
    collapseTask,

    // Task checking
    toggleTaskCheck,
    checkTask,
    uncheckTask,
    clearCheckedTasks,

    // Inline editing
    startInlineEdit,
    cancelInlineEdit,
    finishInlineEdit,
  };
}
