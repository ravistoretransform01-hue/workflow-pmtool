import { ChevronDown, ChevronRight, MessageCirclePlus, MessageSquare } from "lucide-react";

interface Column {
  id: string;
  label: string;
  width: string;
  align: "left" | "center";
  fixed?: boolean;
  render: (task: any, isSubitem?: boolean) => React.ReactNode;
}

export const getWorkloadColumns = ({
  expandedTasks,
  toggleTask,
  onOpenComments,
}: {
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  onOpenComments?: (task: any) => void;
}): Column[] => [
  {
    id: "item",
    label: "Item",
    width: "300px",
    align: "left",
    fixed: true,
    render: (task: any, isSubitem?: boolean) => {
      if (isSubitem) {
        return (
          <div className="flex items-center gap-2 pl-8 justify-between group">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground"> {"├"}</span>
              <span className="font-medium text-foreground">{task.name}</span>
            </div>
            <button
              onClick={() => onOpenComments?.(task)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 justify-between group">
          <button
            onClick={() => toggleTask(task.id)}
            className="flex items-center gap-2 font-medium text-foreground hover:underline"
          >
            {
              // task.subitems?.length > 0 &&
              expandedTasks[task.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            }
            {task.name}
          </button>
          <button
            onClick={() => onOpenComments?.(task)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
          >
            <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      );
    },
  },
  {
    id: "status",
    label: "Status",
    width: "160px",
    align: "center",
    render: (task: any) => task.status ?? "-",
  },
  {
    id: "priority",
    label: "Priority",
    width: "160px",
    align: "center",
    render: (task: any) => task.priority ?? "-",
  },
  {
    id: "date",
    label: "Date",
    width: "160px",
    align: "center",
    render: (task: any) => task.estimatedDate ?? "-",
  },
  {
    id: "person",
    label: "Person",
    width: "128px",
    align: "center",
    render: (task: any) => task.person ?? "-",
    //  render: (task: any) => task.person?.join(", ") ?? "-"
  },
  {
    id: "time",
    label: "Time Spent",
    width: "128px",
    align: "center",
    render: (task: any) => task.timeSpent ?? "-",
  },
];
