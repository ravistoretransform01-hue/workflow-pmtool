import { ChevronDown, ChevronRight } from "lucide-react";

interface Column {
  id: string;
  label: string;
  width: string;
  align: "left" | "center";
  render: (task: any, isSubitem?: boolean) => React.ReactNode;
}

export const getWorkloadColumns = ({
  expandedTasks,
  toggleTask,
}: {
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
}): Column[] => [
  {
    id: "item",
    label: "Item",
    width: "300px",
    align: "left",
    render: (task: any, isSubitem?: boolean) => {
      if (isSubitem) {
        return (
          <div className="flex items-center gap-2 pl-8">
            <span className="text-muted-foreground"> {"├"}</span>
            <span className="font-medium text-foreground">{task.name}</span>
          </div>
        );
      }
      return (
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
    render: (task: any) => task.person?.join(", ") ?? "-",
  },
  {
    id: "time",
    label: "Time Spent",
    width: "128px",
    align: "center",
    render: (task: any) => task.timeSpent ?? "-",
  },
];
