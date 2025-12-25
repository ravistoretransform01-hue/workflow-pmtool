import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { shouldShowRecurringEditDialog, RecurringEditChoice } from "@/components/EditRecurringDialog";
import type { Json } from "@/integrations/supabase/types";

interface PendingEdit {
  taskId: string;
  field: string;
  value: unknown;
  task: {
    repeat_mode?: string | null;
    estimated_date?: string | null;
    isVirtualInstance?: boolean;
    recurring_series_id?: string | null;
    originalTaskId?: string;
    // Full task data for materialization
    name?: string;
    group_id?: string;
    status?: string[] | null;
    priority?: string | null;
    person?: string[] | null;
    estimated_time?: number | null;
    time_spent?: string | null;
    hours_start?: string | null;
    hours_end?: string | null;
    custom_column_values?: Record<string, unknown> | null;
    position?: number;
  };
}

interface UseRecurringTaskEditOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useRecurringTaskEdit(options: UseRecurringTaskEditOptions = {}) {
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  // Materialize a virtual instance into a standalone database row
  const materializeInstance = async (
    task: PendingEdit['task'],
    field: string,
    value: unknown
  ): Promise<string | null> => {
    try {
      // Fetch original task to get all properties
      const { data: originalTask, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', task.originalTaskId)
        .single();

      if (fetchError || !originalTask) {
        console.error('Error fetching original task:', fetchError);
        return null;
      }

      // Create a new standalone item based on the virtual instance
      const newItem: Record<string, unknown> = {
        name: task.name || originalTask.name,
        group_id: task.group_id || originalTask.group_id,
        estimated_date: task.estimated_date, // Use the virtual instance date
        status: task.status || originalTask.status,
        priority: task.priority || originalTask.priority,
        person: task.person || originalTask.person,
        estimated_time: task.estimated_time ?? originalTask.estimated_time,
        time_spent: task.time_spent || originalTask.time_spent,
        hours_start: task.hours_start || originalTask.hours_start,
        hours_end: task.hours_end || originalTask.hours_end,
        custom_column_values: task.custom_column_values || originalTask.custom_column_values,
        position: task.position ?? originalTask.position ?? 0,
        // Mark as non-recurring standalone instance
        repeat_mode: 'does-not-repeat',
        recurring_series_id: task.originalTaskId, // Track which series this came from
      };

      // Apply the edited field value
      if (field === 'custom_column_values') {
        newItem.custom_column_values = value as Json;
      } else {
        newItem[field] = value;
      }

      const { data: insertedItem, error: insertError } = await supabase
        .from('items')
        .insert({
          name: newItem.name as string,
          group_id: newItem.group_id as string,
          estimated_date: newItem.estimated_date as string | null,
          status: newItem.status as string[] | null,
          priority: newItem.priority as string | null,
          person: newItem.person as string[] | null,
          estimated_time: newItem.estimated_time as number | null,
          time_spent: newItem.time_spent as string | null,
          hours_start: newItem.hours_start as string | null,
          hours_end: newItem.hours_end as string | null,
          custom_column_values: newItem.custom_column_values as Json | null,
          position: newItem.position as number,
          repeat_mode: 'does-not-repeat',
          recurring_series_id: task.originalTaskId,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error materializing instance:', insertError);
        return null;
      }

      return insertedItem?.id || null;
    } catch (error) {
      console.error('Error in materializeInstance:', error);
      return null;
    }
  };

  const executeUpdate = async (
    taskId: string,
    field: string,
    value: unknown,
    updateTemplate: boolean = false,
    originalTaskId?: string,
    isVirtualInstance?: boolean,
    task?: PendingEdit['task']
  ) => {
    try {
      // For "this item" on virtual instances, materialize as standalone row
      if (!updateTemplate && isVirtualInstance && task) {
        const newId = await materializeInstance(task, field, value);
        if (newId) {
          options.onSuccess?.();
        } else {
          options.onError?.(new Error('Failed to materialize instance'));
        }
        return;
      }

      // For non-virtual instances or "this and future", update the actual task
      const actualTaskId = originalTaskId || taskId;

      // Update the task itself
      if (field === 'custom_column_values') {
        await supabase
          .from('items')
          .update({ custom_column_values: value as Json, updated_at: new Date().toISOString() })
          .eq('id', actualTaskId);
      } else {
        await supabase
          .from('items')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', actualTaskId);
      }

      // If "this and following events" is selected, update the recurring template
      if (updateTemplate && originalTaskId) {
        // Fetch the current template
        const { data: originalTask } = await supabase
          .from('items')
          .select('recurring_template')
          .eq('id', originalTaskId)
          .single();

        if (originalTask) {
          const currentTemplate = (originalTask.recurring_template as Record<string, Json>) || {};
          const updatedTemplate: Record<string, Json> = {
            ...currentTemplate,
            [field]: value as Json,
          };

          await supabase
            .from('items')
            .update({ 
              recurring_template: updatedTemplate as Json,
              updated_at: new Date().toISOString()
            })
            .eq('id', originalTaskId);
        }
      }

      options.onSuccess?.();
    } catch (error) {
      console.error('Error updating task:', error);
      options.onError?.(error as Error);
    }
  };

  const updateTaskField = useCallback(async (
    taskId: string,
    field: string,
    value: unknown,
    task: PendingEdit['task']
  ) => {
    // Check if we need to show the recurring edit dialog
    if (shouldShowRecurringEditDialog(task)) {
      setPendingEdit({ taskId, field, value, task });
      setShowRecurringDialog(true);
      return false; // Indicates edit is pending confirmation
    }

    // Not a recurring task or is due today - execute immediately
    const actualTaskId = task.isVirtualInstance ? task.originalTaskId : taskId;
    await executeUpdate(actualTaskId || taskId, field, value, false);
    return true; // Indicates edit was executed
  }, []);

  const handleRecurringDialogConfirm = useCallback(async (choice: RecurringEditChoice) => {
    if (!pendingEdit) return;

    const { taskId, field, value, task } = pendingEdit;
    const actualTaskId = task.isVirtualInstance ? task.originalTaskId : taskId;
    const updateTemplate = choice === "this-and-future";

    await executeUpdate(
      actualTaskId || taskId, 
      field, 
      value, 
      updateTemplate,
      task.originalTaskId,
      task.isVirtualInstance,
      task
    );

    setPendingEdit(null);
    setShowRecurringDialog(false);
  }, [pendingEdit]);

  const handleRecurringDialogCancel = useCallback(() => {
    setPendingEdit(null);
    setShowRecurringDialog(false);
  }, []);

  return {
    showRecurringDialog,
    setShowRecurringDialog,
    pendingEdit,
    updateTaskField,
    handleRecurringDialogConfirm,
    handleRecurringDialogCancel,
  };
}
