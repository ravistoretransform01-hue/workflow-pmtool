// import React, { useState } from "react";
// import {
//   useSortable,
//   SortableContext,
//   verticalListSortingStrategy,
// } from "@dnd-kit/sortable";
// import { CSS } from "@dnd-kit/utilities";
// import { Plus } from "lucide-react";
// import { Button } from "@/shared/components/ui/button";
// import { Input } from "@/shared/components/ui/input";
// import type { Status } from "@/features/cms/types";
// import type { Task } from "./WorkloadBoard";
// import { KanbanCard } from "./KanbanCard";
// import { useDroppable } from "@dnd-kit/core";

// interface KanbanColumnProps {
//   status: Status;
//   tasks: Task[];
//   onTaskClick: (task: Task) => void;
//   onAddTask?: (groupId: string, statusId: string, taskName: string) => Promise<void>;
// }

// export function KanbanColumn({
//   status,
//   tasks,
//   onTaskClick,
//   onAddTask,
// }: KanbanColumnProps) {
//   const [isAddingTask, setIsAddingTask] = useState(false);
//   const [newTaskName, setNewTaskName] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   const { setNodeRef } = useDroppable({
//     id: `status-${status.id}`,
//   });

//   const handleAddTask = async () => {
//     if (!newTaskName.trim() || !onAddTask) return;

//     setIsLoading(true);
//     try {
//       // Use the first group's ID (or you could pass it as a prop)
//       const groupId = "1"; // TODO: Make this configurable
//       await onAddTask(groupId, String(status.id), newTaskName.trim());
//       setNewTaskName("");
//       setIsAddingTask(false);
//     } catch (error) {
//       console.error("Failed to add task:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div
//       ref={setNodeRef}
//       className="flex-shrink-0 w-80 bg-muted rounded-lg border border-border flex flex-col"
//     >
//       {/* Column Header */}
//       <div className="p-4 border-b border-border">
//         <div className="flex items-center gap-2 mb-2">
//           <div
//             className="w-3 h-3 rounded-full"
//             style={{ backgroundColor: status.color_code }}
//           />
//           <h3 className="font-semibold text-sm">{status.name}</h3>
//           <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-1 rounded">
//             {tasks.length}
//           </span>
//         </div>
//       </div>

//       {/* Tasks Container */}
//       <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
//         <SortableContext
//           items={tasks.map((t) => t.id)}
//           strategy={verticalListSortingStrategy}
//         >
//           {tasks.map((task) => (
//             <KanbanCard
//               key={task.id}
//               task={task}
//               onClick={() => onTaskClick(task)}
//             />
//           ))}
//         </SortableContext>

//         {/* Add Task Form */}
//         {isAddingTask ? (
//           <div className="space-y-2 p-2 bg-background rounded border border-border">
//             <Input
//               autoFocus
//               placeholder="Task name..."
//               value={newTaskName}
//               onChange={(e) => setNewTaskName(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") {
//                   handleAddTask();
//                 } else if (e.key === "Escape") {
//                   setIsAddingTask(false);
//                   setNewTaskName("");
//                 }
//               }}
//               className="h-8 text-sm"
//             />
//             <div className="flex gap-2">
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="flex-1 h-7 text-xs"
//                 onClick={() => {
//                   setIsAddingTask(false);
//                   setNewTaskName("");
//                 }}
//               >
//                 Cancel
//               </Button>
//               <Button
//                 size="sm"
//                 className="flex-1 h-7 text-xs"
//                 onClick={handleAddTask}
//                 disabled={!newTaskName.trim() || isLoading}
//               >
//                 {isLoading ? "Adding..." : "Add"}
//               </Button>
//             </div>
//           </div>
//         ) : (
//           <Button
//             variant="ghost"
//             size="sm"
//             className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
//             onClick={() => setIsAddingTask(true)}
//           >
//             <Plus className="h-3 w-3 mr-1" />
//             Add Task
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }
