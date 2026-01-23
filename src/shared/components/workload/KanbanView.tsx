// import React, { useMemo } from "react";
// import {
//   DndContext,
//   closestCenter,
//   PointerSensor,
//   useSensor,
//   useSensors,
//   type DragEndEvent,
// } from "@dnd-kit/core";
// // import {
// //   SortableContext,
// //   verticalListSortingStrategy,
// // } from "@dnd-kit/sortable";
// // import { Plus } from "lucide-react";
// // import { Button } from "@/shared/components/ui/button";
// // import { Input } from "@/shared/components/ui/input";
// import type { Status } from "@/features/cms/types";
// import type { Task } from "./WorkloadBoard";
// import { KanbanColumn } from "./KanbanColumn";

// interface KanbanViewProps {
//   groups: Array<{ id: string; name: string; color: string; tasks: Task[] }>;
//   statuses: Status[];
//   onTaskMove: (taskId: string, newStatusId: string) => Promise<void>;
//   onTaskClick: (task: Task) => void;
//   onAddTask?: (groupId: string, statusId: string, taskName: string) => Promise<void>;
//   searchQuery?: string;
// }

// export function KanbanView({
//   groups,
//   statuses,
//   onTaskMove,
//   onTaskClick,
//   onAddTask,
//   searchQuery = "",
// }: KanbanViewProps) {
//   const sensors = useSensors(
//     useSensor(PointerSensor, {
//       activationConstraint: {
//         distance: 8,
//       },
//     })
//   );

//   // Organize tasks by status
//   const tasksByStatus = useMemo(() => {
//     const organized: Record<string, Task[]> = {};

//     // Initialize all statuses
//     statuses.forEach((status) => {
//       organized[String(status.id)] = [];
//     });

//     // Distribute tasks from all groups
//     groups.forEach((group) => {
//       group.tasks.forEach((task) => {
//         const statusId = String(task.status_id || "");
//         if (organized[statusId]) {
//           organized[statusId].push(task);
//         }
//       });
//     });

//     // Filter by search query if provided
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase();
//       Object.keys(organized).forEach((statusId) => {
//         organized[statusId] = organized[statusId].filter((task) =>
//           task.name.toLowerCase().includes(query)
//         );
//       });
//     }

//     return organized;
//   }, [groups, statuses, searchQuery]);

//   const handleDragEnd = async (event: DragEndEvent) => {
//     const { active, over } = event;

//     if (!over) return;

//     const taskId = String(active.id);
//     const newStatusId = String(over.id);

//     // Extract status ID from the over ID (format: "status-{statusId}")
//     const statusMatch = newStatusId.match(/^status-(.+)$/);
//     if (!statusMatch) return;

//     const statusId = statusMatch[1];

//     try {
//       await onTaskMove(taskId, statusId);
//     } catch (error) {
//       console.error("Failed to move task:", error);
//     }
//   };

//   return (
//     <DndContext
//       sensors={sensors}
//       collisionDetection={closestCenter}
//       onDragEnd={handleDragEnd}
//     >
//       <div className="flex gap-4 overflow-x-auto p-6 h-full">
//         {statuses.map((status) => (
//           <KanbanColumn
//             key={status.id}
//             status={status}
//             tasks={tasksByStatus[String(status.id)] || []}
//             onTaskClick={onTaskClick}
//             onAddTask={onAddTask}
//           />
//         ))}
//       </div>
//     </DndContext>
//   );
// }
