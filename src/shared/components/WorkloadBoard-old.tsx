import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { groupsApi } from "@/features/groups/api/groupsApi";
import {
  LayoutDashboard,
  Filter,
  ArrowUpDown,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Search,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  MessageCirclePlus,
  AtSign,
  Home,
  RefreshCcw,
  Activity,
  Trash2,
  ArrowRight,
  Star,
  User,
  Users,
  CalendarDays,
  Clock,
  PieChart,
  LayoutList,
  Columns
  // GripVertical,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Progress } from "@/shared/ui/progress";
import { MentionRichTextEditor } from "@/shared/components/MentionRichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/tabs";
// import { Popover, PopoverContent, PopoverTrigger} from "@/shared/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GifPicker } from "@/shared/components/GifPicker";
import { FileUploadDropdown } from "@/shared/components/FileUploadDropdown";
import { EmojiPicker } from "@/shared/components/EmojiPicker";
import { TableHeaderCell } from "@/shared/ui/tableHeadCell";
import { debugLog } from "@/utils/debugLog";

interface WorkloadBoardProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceName: string;
}

interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  status: string[];
  priority: string;
  estimatedDate: string;
  person: string[];
  timeSpent: string;
  subitems?: Task[];
}

const DEFAULT_TABS = [
  "Main Table",
  "List",
  "Kanban",
  "Calendar",
  "Workload",
  "Teams",
  "Time",
  "Recurring",
  "Completed",
  "Gantt",
  "SOP",
  "Doc",
  "Updates",
  "Dashboard",
];

const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
];

// Helper function to format seconds to time string (e.g., "2h 30m")
const formatSecondsToTime = (seconds: number): string => {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper function to calculate group progress
const calculateGroupProgress = (tasks: Task[]) => {
  let totalTimeSpentSeconds = 0;
  let totalEstimatedSeconds = 0;

  tasks.forEach((task) => {
    // Parse time spent (e.g., "2h 30m" or "45m")
    const timeSpentMatch = task.timeSpent?.match(/(\d+)h\s*(\d+)m|(\d+)m/);
    if (timeSpentMatch) {
      if (timeSpentMatch[1]) {
        totalTimeSpentSeconds +=
          parseInt(timeSpentMatch[1]) * 3600 + parseInt(timeSpentMatch[2]) * 60;
      } else {
        totalTimeSpentSeconds += parseInt(timeSpentMatch[3]) * 60;
      }
    }

    // Parse estimated date/time if available (for now, we'll use a default)
    // This would need to be extended based on your data structure
  });

  const percentage =
    totalEstimatedSeconds > 0
      ? Math.min(100, (totalTimeSpentSeconds / totalEstimatedSeconds) * 100)
      : 0;

  return {
    timeSpentSeconds: totalTimeSpentSeconds,
    estimatedTimeSeconds: totalEstimatedSeconds,
    percentage,
  };
};

// Sortable Tab Component
interface SortableViewTabProps {
  tab: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
}

// Sortable Group Component
interface SortableGroupProps {
  group: TaskGroup;
  children: (dragListeners: any, dragAttributes: any) => React.ReactNode;
}

const SortableGroup = ({ group, children }: SortableGroupProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6 flex items-start gap-2">
      {children(listeners, attributes)}
    </div>
  );
};

function SortableViewTab({ tab, activeTab, onTabClick }: SortableViewTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tab,
    data: {
      type: "tab",
    },
  });

  // Restrict transform to horizontal only (remove Y axis)
  let style = {
    transform: transform ? `translate3d(${transform.x}px, 0px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
        activeTab === tab
          ? "text-primary border-b-primary"
          : "text-muted-foreground border-b-transparent hover:text-foreground"
      }`}
      onClick={() => onTabClick(tab)}
      {...attributes}
      {...listeners}
    >
      {tab}
    </button>
  );
}

export function WorkloadBoard({
  boardName,
  boardId,
  workspaceId,
  workspaceName,
}: WorkloadBoardProps) {
  const navigate = useNavigate();
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameValue, setBoardNameValue] = useState(boardName);
  const [activeTab, setActiveTab] = useState("Main Table");
  // Main Table FilterRow states
  const [mainTableSearchQuery, setMainTableSearchQuery] = useState("");
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [groupColors, setGroupColors] = useState<Record<string, string>>({});
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");
  const [newGroupColorInput, setNewGroupColorInput] = useState("#3b82f6");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState<string | null>(
    null
  );
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [addingItemToGroup, setAddingItemToGroup] = useState<string | null>(
    null
  );
  const [newItemName, setNewItemName] = useState("");
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [addingSubitemToTask, setAddingSubitemToTask] = useState<string | null>(
    null
  );
  const [newSubitemName, setNewSubitemName] = useState("");
  const [isCreatingSubitem, setIsCreatingSubitem] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateFiles, setUpdateFiles] = useState<
    Array<{ name: string; size: number; type: string; url: string }>
  >([]);

  // Load saved tab order from localStorage
  const [viewTabs, setViewTabs] = useState(() => {
    const savedTabs = localStorage.getItem(`board-tabs-${boardId}`);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        // Ensure all default tabs exist in saved order
        const allTabs = [...new Set([...parsed, ...DEFAULT_TABS])];
        return allTabs.filter((tab) => DEFAULT_TABS.includes(tab));
      } catch {
        return DEFAULT_TABS;
      }
    }
    return DEFAULT_TABS;
  });

  // Fetch groups from API on component mount
  useEffect(() => {
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const boardIdNum = parseInt(boardId, 10);
        const fetchedGroups = await groupsApi.getGroupsByBoard(boardIdNum);

        // Transform API response to TaskGroup format
        const transformedGroups: TaskGroup[] = fetchedGroups.map(
          (group: any) => ({
            id: String(group.id),
            name: group.name,
            color: group.color || "#3b82f6",
            tasks: group.tasks || [],
          })
        );

        setGroups(transformedGroups);

        // Initialize groupNames, groupColors, and expandedGroups from fetched data
        const names: Record<string, string> = {};
        const colors: Record<string, string> = {};
        const expanded: Record<string, boolean> = {};

        transformedGroups.forEach((group) => {
          names[group.id] = group.name;
          colors[group.id] = group.color;
          expanded[group.id] = true;
        });

        setGroupNames(names);
        setGroupColors(colors);
        setExpandedGroups(expanded);
      } catch (error) {
        console.error("Failed to load groups:", error);
        toast.error("Failed to load groups");
        // Set empty groups on error
        setGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [boardId]);

  const handleBoardNameDoubleClick = () => {
    setEditingBoardName(true);
    setBoardNameValue(boardName);
  };

  const handleBoardNameBlur = () => {
    setEditingBoardName(false);
  };

  const handleBoardNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setEditingBoardName(false);
    } else if (e.key === "Escape") {
      setBoardNameValue(boardName);
      setEditingBoardName(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleViewTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = viewTabs.findIndex((tab) => tab === active.id);
      const newIndex = viewTabs.findIndex((tab) => tab === over.id);

      const newTabs = arrayMove(viewTabs, oldIndex, newIndex);
      setViewTabs(newTabs);

      // Persist tab order to localStorage
      localStorage.setItem(`board-tabs-${boardId}`, JSON.stringify(newTabs));
    }
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      const newGroups = arrayMove(groups, oldIndex, newIndex);
      setGroups(newGroups);

      // Persist group order to localStorage
      localStorage.setItem(
        `board-groups-${boardId}`,
        JSON.stringify(newGroups)
      );
    }
  };

  const addNewGroup = async () => {
    setNewGroupDialogOpen(true);
    setNewGroupNameInput("");
  };

  const handleCreateGroup = async () => {
    if (!newGroupNameInput.trim()) {
      return;
    }

    setIsCreatingGroup(true);
    try {
      const boardIdNum = parseInt(boardId, 10);
      const organizationIdStr = localStorage.getItem("organization_id");
      const organizationIdNum = organizationIdStr
        ? parseInt(organizationIdStr, 10)
        : null;

      if (!organizationIdNum) {
        toast.error("Organization not found");
        return;
      }
      const payload = {
        board_id: boardIdNum,
        workspace_id: parseInt(workspaceId, 10),
        organization_id: organizationIdNum, // This should come from context/props
        name: newGroupNameInput.trim(),
        color: newGroupColorInput, // Use selected color
      };

      const newGroup = await groupsApi.createGroup(payload);

      // Transform API response to TaskGroup format
      const transformedGroup: TaskGroup = {
        id: String(newGroup.id),
        name: newGroup.name,
        color: newGroup.color || newGroupColorInput,
        tasks: newGroup.tasks || [],
      };

      setGroups([...groups, transformedGroup]);
      setGroupNames({ ...groupNames, [String(newGroup.id)]: newGroup.name });
      setGroupColors({ ...groupColors, [String(newGroup.id)]: newGroup.color });
      setExpandedGroups({ ...expandedGroups, [String(newGroup.id)]: true });

      // Close dialog and reset input
      setNewGroupDialogOpen(false);
      setNewGroupNameInput("");
      setNewGroupColorInput("#3b82f6"); // Reset to default color

      toast.success(`Group "${newGroupNameInput.trim()}" created successfully`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId],
    });
  };

  const deleteGroup = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteGroupDialogOpen(true);
    setGroupDropdownOpen(null);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeletingGroup(true);
    try {
      const groupName = groupNames[groupToDelete] || "Group";

      // Call API to delete group
      await groupsApi.deleteGroup(groupToDelete);

      // Update local state
      const updatedGroups = groups.filter((g) => g.id !== groupToDelete);
      setGroups(updatedGroups);

      // Remove from state objects
      const updatedGroupNames = { ...groupNames };
      delete updatedGroupNames[groupToDelete];
      setGroupNames(updatedGroupNames);

      const updatedGroupColors = { ...groupColors };
      delete updatedGroupColors[groupToDelete];
      setGroupColors(updatedGroupColors);

      const updatedExpandedGroups = { ...expandedGroups };
      delete updatedExpandedGroups[groupToDelete];
      setExpandedGroups(updatedExpandedGroups);

      // Close dialog and reset
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);

      // Show success toast
      toast.success(`Group "${groupName}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const addNewItem = async (groupId: string) => {
    if (!newItemName.trim()) {
      setAddingItemToGroup(null);
      return;
    }

    setIsCreatingItem(true);
    try {
      // Create new task object
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: newItemName.trim(),
        status: [],
        priority: "Medium",
        estimatedDate: "-",
        person: [],
        timeSpent: "0m",
      };

      // Update groups with new task
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tasks: [...group.tasks, newTask],
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      setNewItemName("");
      setAddingItemToGroup(null);
      toast.success("Item added successfully");
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleNewItemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    groupId: string
  ) => {
    if (e.key === "Enter") {
      addNewItem(groupId);
    } else if (e.key === "Escape") {
      setAddingItemToGroup(null);
      setNewItemName("");
    }
  };

  const addSubitem = async (groupId: string, taskId: string) => {
    if (!newSubitemName.trim()) {
      setAddingSubitemToTask(null);
      return;
    }

    setIsCreatingSubitem(true);
    try {
      // Create new subitem object
      const newSubitem: Task = {
        id: `subitem-${Date.now()}`,
        name: newSubitemName.trim(),
        status: [],
        priority: "Medium",
        estimatedDate: "-",
        person: [],
        timeSpent: "0m",
        subitems: [],
      };

      // Update groups with new subitem
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tasks: group.tasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  subitems: [...(task.subitems || []), newSubitem],
                };
              }
              return task;
            }),
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      setNewSubitemName("");
      setAddingSubitemToTask(null);
      toast.success("Subitem added successfully");
    } catch (error) {
      console.error("Failed to add subitem:", error);
      toast.error("Failed to add subitem");
    } finally {
      setIsCreatingSubitem(false);
    }
  };

  const handleNewSubitemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    groupId: string,
    taskId: string
  ) => {
    if (e.key === "Enter") {
      addSubitem(groupId, taskId);
    } else if (e.key === "Escape") {
      setAddingSubitemToTask(null);
      setNewSubitemName("");
    }
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks({
      ...expandedTasks,
      [taskId]: !expandedTasks[taskId],
    });
  };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    groups.forEach((group) => {
      allCollapsed[group.id] = false;
    });
    setExpandedGroups(allCollapsed);
  };

  const expandAllGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    groups.forEach((group) => {
      allExpanded[group.id] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const openCommentsPanel = (task: Task) => {
    setSelectedTask(task);
    setCommentsPanelOpen(true);
  };

  const getFilteredGroups = () => {
    const query = mainTableSearchQuery.trim().toLowerCase();

    if (!query) return groups;

    return groups
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(query);

        const filteredTasks = group.tasks
          .map((task) => {
            const taskMatches = task.name.toLowerCase().includes(query);

            const filteredSubitems =
              task.subitems?.filter((sub) =>
                sub.name.toLowerCase().includes(query)
              ) || [];

            // keep task if task OR any subitem matches
            if (taskMatches || filteredSubitems.length > 0) {
              return {
                ...task,
                subitems: filteredSubitems,
              };
            }

            return null;
          })
          .filter(Boolean) as Task[];

        // keep group if:
        // - group name matches
        // - OR any task/subitem matches
        if (groupMatches || filteredTasks.length > 0) {
          return {
            ...group,
            tasks: groupMatches ? group.tasks : filteredTasks,
          };
        }

        return null;
      })
      .filter(Boolean) as TaskGroup[];
  };

  const saveUpdate = () => {
    if (!updateText.trim()) {
      return;
    }

    try {
      // Save update (in a real app, this would call an API)
      debugLog("Saving update:", updateText);
      toast.success("Update saved successfully");

      // Reset the form
      setUpdateText("");
      setUpdateFiles([]);
    } catch (error) {
      console.error("Failed to save update:", error);
      toast.error("Failed to save update");
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Image resize styles */}
      <style>{`
        .image-resize-wrapper:hover {
          outline: 2px dashed hsl(var(--primary) / 0.5);
          outline-offset: 4px;
        }
        .image-resize-wrapper:hover .resize-handle {
          opacity: 1;
        }
        .resize-handle {
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .resize-handle:hover {
          opacity: 1;
          transform: scale(1.2);
        }
      `}</style>

      {/* Top Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {editingBoardName ? (
              <Input
                autoFocus
                value={boardNameValue}
                onChange={(e) => setBoardNameValue(e.target.value)}
                onBlur={handleBoardNameBlur}
                onKeyDown={handleBoardNameKeyDown}
                className="text-2xl font-semibold h-10 px-2"
              />
            ) : (
              <h1
                className="text-2xl font-semibold text-foreground cursor-text"
                onDoubleClick={handleBoardNameDoubleClick}
              >
                {boardName}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Board Members Display */}
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                <Avatar className="w-8 h-8 border-2 border-background">
                  <AvatarFallback className="bg-blue-500">
                    <span className="text-white text-xs font-semibold">U</span>
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Dashboard Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/workspace/${workspaceId}/board/${boardId}/dashboard`)
              }
              className="h-8 px-3"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleViewTabDragEnd}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            <SortableContext
              items={viewTabs}
              strategy={horizontalListSortingStrategy}
            >
              {viewTabs.map((tab) => (
                <SortableViewTab
                  key={tab}
                  tab={tab}
                  activeTab={activeTab}
                  onTabClick={handleTabChange}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Main Table View */}
        {activeTab === "Main Table" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="border-b border-border px-6 py-4 flex items-center gap-3 flex-wrap">
              {/* New Group Button */}
              <Button
                variant="default"
                size="sm"
                onClick={addNewGroup}
                disabled={isLoadingGroups}
              >
                New Group
              </Button>
              {/* Search */}
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={mainTableSearchQuery}
                    onChange={(e) => setMainTableSearchQuery(e.target.value)}
                    className="pl-9 h-8 bg-background border-border w-48"
                  />
                </div>
              </div>

              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="ghost" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button>
              <Button variant="ghost" size="sm">
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </Button>
            </div>

            {/* Task Groups */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <DndContext
                sensors={groupSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGroupDragEnd}
              >
                <SortableContext
                  items={getFilteredGroups().map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {getFilteredGroups().length === 0 ? (
                      <div className="text-center py-12">
                        {mainTableSearchQuery.trim() ? (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No items found matching "{mainTableSearchQuery}"
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No groups yet. Create one to get started.
                            </p>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={addNewGroup}
                            >
                              Create First Group
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      getFilteredGroups().map((group) => (
                        <SortableGroup key={group.id} group={group}>
                          {(dragListeners, dragAttributes) => (
                            <div
                              className="bg-card border border-border overflow-hidden flex-1 border-l-4"
                              style={{
                                borderLeftColor:
                                  groupColors[group.id] || "#3b82f6",
                              }}
                              {...dragAttributes}
                              {...dragListeners}
                            >
                              {/* Group Header */}

                              <div className="group/header w-full flex items-center gap-2 px-4 py-3 hover:bg-hover transition-colors cursor-grab active:cursor-grabbing">
                                {/* Group Actions Dropdown */}
                                <DropdownMenu
                                  open={groupDropdownOpen === group.id}
                                  onOpenChange={(open) =>
                                    setGroupDropdownOpen(open ? group.id : null)
                                  }
                                >
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 shrink-0 hover:bg-hover"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => toggleGroup(group.id)}
                                    >
                                      {expandedGroups[group.id] ? (
                                        <>
                                          <Minimize2 className="h-4 w-4 mr-2" />
                                          Collapse this group
                                        </>
                                      ) : (
                                        <>
                                          <Maximize2 className="h-4 w-4 mr-2" />
                                          Expand this group
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => collapseAllGroups()}
                                    >
                                      <Minimize2 className="h-4 w-4 mr-2" />
                                      Collapse all groups
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => expandAllGroups()}
                                    >
                                      <Maximize2 className="h-4 w-4 mr-2" />
                                      Expand all groups
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="text-red-400 cursor-pointer"
                                      onClick={() => deleteGroup(group.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete group
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <button
                                  onClick={() => toggleGroup(group.id)}
                                  className="flex items-center gap-2"
                                >
                                  {expandedGroups[group.id] ? (
                                    <ChevronDown
                                      className="h-5 w-5 text-primary"
                                      style={{
                                        color:
                                          groupColors[group.id] || "#3b82f6",
                                      }}
                                    />
                                  ) : (
                                    <ChevronRight
                                      className="h-5 w-5 text-muted-foreground"
                                      style={{
                                        color:
                                          groupColors[group.id] || "#3b82f6",
                                      }}
                                    />
                                  )}
                                </button>

                                <span
                                  className="font-semibold text-lg text-primary"
                                  style={{
                                    color: groupColors[group.id] || "#3b82f6",
                                  }}
                                >
                                  {groupNames[group.id] || group.name}
                                </span>

                                {/* Group Progress Bar - Time Spent vs Estimated Time */}
                                {(() => {
                                  const progress = calculateGroupProgress(
                                    group.tasks
                                  );
                                  return (
                                    <div className="flex items-center gap-2 flex-1 ml-4">
                                      <Progress
                                        value={progress.percentage}
                                        className="h-2 flex-1 max-w-[200px]"
                                      />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatSecondsToTime(
                                          progress.timeSpentSeconds
                                        )}{" "}
                                        /{" "}
                                        {progress.estimatedTimeSeconds > 0
                                          ? formatSecondsToTime(
                                              progress.estimatedTimeSeconds
                                            )
                                          : "—"}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Task Table */}
                              {expandedGroups[group.id] && (
                                <div className="overflow-x-auto">
                                  <table
                                    className="w-full"
                                    style={{ tableLayout: "auto" }}
                                  >
                                <thead className="border-b border-border bg-muted/30">
                                    <tr className="text-sm text-muted-foreground">
                                      {/* Checkbox */}
                                      <th className="p-4 w-12 text-center border-r border-border">
                                        <input type="checkbox" className="rounded" />
                                      </th>

                                      <TableHeaderCell title="Item" width="300px" />
                                      <TableHeaderCell title="Status" width="160px" />
                                      <TableHeaderCell title="Priority" width="160px" />
                                      <TableHeaderCell title="Date" width="160px" />
                                      <TableHeaderCell title="Person" width="128px" />
                                      <TableHeaderCell title="Time Spent" width="128px" showRightBorder={false} />
                                    </tr>
                                  </thead>


                                    <tbody className="divide-y divide-border">
                                      {group.tasks.length === 0 ? (
                                        <tr>
                                          <td className="p-4 text-center border-r border-border">
                                            {/* <input
                                              type="checkbox"
                                              className="rounded"
                                              disabled
                                            /> */}
                                          </td>
                                          <td colSpan={6} className="p-4">
                                            {addingItemToGroup === group.id ? (
                                              <Input
                                                value={newItemName}
                                                onChange={(e) =>
                                                  setNewItemName(e.target.value)
                                                }
                                                onBlur={() =>
                                                  addNewItem(group.id)
                                                }
                                                onKeyDown={(e) =>
                                                  handleNewItemKeyDown(
                                                    e,
                                                    group.id
                                                  )
                                                }
                                                placeholder="Enter item name..."
                                                className="h-8"
                                                autoFocus
                                                disabled={isCreatingItem}
                                              />
                                            ) : (
                                              <button
                                                onClick={() =>
                                                  setAddingItemToGroup(group.id)
                                                }
                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                + Add item
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ) : (
                                        <>
                                          {group.tasks.map((task) => (
                                            <>
                                              <tr
                                                key={task.id}
                                                className="hover:bg-hover transition-colors group/item"
                                              >
                                                <td className="p-4 text-center border-r border-border">
                                                  <input
                                                    type="checkbox"
                                                    className="rounded"
                                                  />
                                                </td>

                                                <td className="p-4 border-r border-border">
                                                  <div className="flex items-center justify-between">
                                                    {/* LEFT SIDE */}
                                                    <div className="flex items-center gap-3">
                                                      <button
                                                        onClick={() =>
                                                          toggleTask(task.id)
                                                        }
                                                        className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                      >
                                                        {expandedTasks[
                                                          task.id
                                                        ] ? (
                                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                      </button>

                                                      <span className="font-medium text-foreground cursor-pointer">
                                                        {task.name}
                                                      </span>
                                                    </div>

                                                    {/* RIGHT SIDE */}
                                                    <button
                                                      onClick={() =>
                                                        openCommentsPanel(task)
                                                      }
                                                      className="opacity-0 group-hover/item:opacity-100 transition-opacity ml-2"
                                                      title="Open comments"
                                                    >
                                                      <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                    {/* <MessageCirclePlus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" /> */}
                                                  </div>
                                                </td>

                                                <td className="p-4 text-center border-r border-border">
                                                  <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                                    {task.status.length > 0
                                                      ? task.status[0]
                                                      : "To Do"}
                                                  </span>
                                                </td>
                                                <td className="p-4 text-center border-r border-border">
                                                  <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                                                    {task.priority || "High"}
                                                  </span>
                                                </td>
                                                <td className="p-4 text-center border-r border-border">
                                                  <span className="text-sm text-muted-foreground">
                                                    {task.estimatedDate || "-"}
                                                  </span>
                                                </td>
                                                <td className="p-4 text-center border-r border-border">
                                                  <Avatar className="w-6 h-6">
                                                    <AvatarFallback className="bg-blue-500 text-xs">
                                                      {task.person.length > 0
                                                        ? task.person[0].charAt(
                                                            0
                                                          )
                                                        : "U"}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                </td>
                                                <td className="p-4 text-center">
                                                  <span className="text-sm text-muted-foreground">
                                                    {task.timeSpent || "0m"}
                                                  </span>
                                                </td>
                                              </tr>
                                              {/* Render subitems - only if task is expanded */}
                                              {expandedTasks[task.id] &&
                                                task.subitems &&
                                                task.subitems.length > 0 &&
                                                task.subitems.map(
                                                  (subitem: Task) => (
                                                    <tr
                                                      key={subitem.id}
                                                      className="hover:bg-hover transition-colors group/item bg-muted/30"
                                                    >
                                                      <td className="p-4 text-center border-r border-border">
                                                        <input
                                                          type="checkbox"
                                                          className="rounded"
                                                        />
                                                      </td>
                                                      <td className="p-4 border-r border-border pl-12">
                                                        <div className="flex items-center gap-3">
                                                          <span className="text-muted-foreground">
                                                            └
                                                          </span>
                                                          <span className="font-medium text-foreground cursor-pointer text-sm">
                                                            {subitem.name}
                                                          </span>
                                                        </div>
                                                      </td>
                                                      <td className="p-4 text-center border-r border-border">
                                                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                                          {subitem.status
                                                            .length > 0
                                                            ? subitem.status[0]
                                                            : "To Do"}
                                                        </span>
                                                      </td>
                                                      <td className="p-4 text-center border-r border-border">
                                                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                                                          {subitem.priority ||
                                                            "High"}
                                                        </span>
                                                      </td>
                                                      <td className="p-4 text-center border-r border-border">
                                                        <span className="text-sm text-muted-foreground">
                                                          {subitem.estimatedDate ||
                                                            "-"}
                                                        </span>
                                                      </td>
                                                      <td className="p-4 text-center border-r border-border">
                                                        <Avatar className="w-6 h-6">
                                                          <AvatarFallback className="bg-blue-500 text-xs">
                                                            {subitem.person
                                                              .length > 0
                                                              ? subitem.person[0].charAt(
                                                                  0
                                                                )
                                                              : "U"}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                      </td>
                                                      <td className="p-4 text-center">
                                                        <span className="text-sm text-muted-foreground">
                                                          {subitem.timeSpent ||
                                                            "0m"}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  )
                                                )}
                                              {/* Add Subitem Row - only if task is expanded */}
                                              {expandedTasks[task.id] && (
                                                <tr className="hover:bg-hover transition-colors bg-muted/20">
                                                  <td className="p-4 text-center border-r border-border">
                                                    {/* <input
                                                      type="checkbox"
                                                      className="rounded"
                                                      disabled
                                                    /> */}
                                                  </td>
                                                  <td
                                                    colSpan={6}
                                                    className="p-4 pl-12"
                                                  >
                                                    {addingSubitemToTask ===
                                                    task.id ? (
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground text-sm">
                                                          └
                                                        </span>
                                                        <Input
                                                          value={newSubitemName}
                                                          onChange={(e) =>
                                                            setNewSubitemName(
                                                              e.target.value
                                                            )
                                                          }
                                                          onBlur={() =>
                                                            addSubitem(
                                                              group.id,
                                                              task.id
                                                            )
                                                          }
                                                          onKeyDown={(e) =>
                                                            handleNewSubitemKeyDown(
                                                              e,
                                                              group.id,
                                                              task.id
                                                            )
                                                          }
                                                          placeholder="Enter subitem name..."
                                                          className="h-8 text-sm flex-1"
                                                          autoFocus
                                                          disabled={
                                                            isCreatingSubitem
                                                          }
                                                        />
                                                      </div>
                                                    ) : (
                                                      <button
                                                        onClick={() =>
                                                          setAddingSubitemToTask(
                                                            task.id
                                                          )
                                                        }
                                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                                                      >
                                                        <span>└</span>
                                                        <span>
                                                          + Add subitem
                                                        </span>
                                                      </button>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </>
                                          ))}
                                          <tr>
                                            <td className="p-4 text-center border-r border-border">
                                              {/* <input
                                                type="checkbox"
                                                className="rounded"
                                                disabled
                                              /> */}
                                            </td>
                                            <td colSpan={6} className="p-4">
                                              {addingItemToGroup ===
                                              group.id ? (
                                                <Input
                                                  value={newItemName}
                                                  onChange={(e) =>
                                                    setNewItemName(
                                                      e.target.value
                                                    )
                                                  }
                                                  onBlur={() =>
                                                    addNewItem(group.id)
                                                  }
                                                  onKeyDown={(e) =>
                                                    handleNewItemKeyDown(
                                                      e,
                                                      group.id
                                                    )
                                                  }
                                                  placeholder="Enter item name..."
                                                  className="h-8"
                                                  autoFocus
                                                  disabled={isCreatingItem}
                                                />
                                              ) : (
                                                <button
                                                  onClick={() =>
                                                    setAddingItemToGroup(
                                                      group.id
                                                    )
                                                  }
                                                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                  + Add item
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        </>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </SortableGroup>
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* Teams/Workload View - Based on the mockups */}
        {(activeTab === "Teams" || activeTab === "Workload") && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/10 flex flex-col min-h-0">
            {/* Header info matching screenshot */}
            <div className="mb-6 shrink-0">
              <h2 className="text-2xl font-bold">{boardName || "Project RoadMap"} 06/19</h2>
              <p className="text-muted-foreground text-sm mt-1">Plan and track your project development strategy.</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm font-medium text-muted-foreground">
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><ArrowRight className="w-4 h-4" /> By Status</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><Star className="w-4 h-4" /> All Projects</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><User className="w-4 h-4" /> My Projects</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><Users className="w-4 h-4" /> By Team</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><CalendarDays className="w-4 h-4" /> By Quarter</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><Clock className="w-4 h-4" /> Timeline</button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors"><PieChart className="w-4 h-4" /> Chart</button>
                
                <div className="flex bg-muted/30 p-1 rounded-md ml-2 border border-border/50">
                   <button className="px-3 py-1 bg-background shadow-sm rounded flex items-center gap-2 text-foreground"><Columns className="w-4 h-4" /> Board</button>
                   <button className="px-3 py-1 hover:bg-background hover:shadow-sm rounded flex items-center gap-2 transition-all"><LayoutList className="w-4 h-4" /> Table</button>
                </div>

                <div className="flex-1"></div>
                <button className="hover:text-foreground"><Filter className="w-4 h-4" /></button>
                <button className="hover:text-foreground"><ArrowUpDown className="w-4 h-4" /></button>
                <button className="hover:text-foreground"><Search className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Kanban by Team Member */}
            <div className="flex flex-1 gap-6 overflow-x-auto overflow-y-hidden pb-4 items-start">
              {(() => {
                const filteredGroups = getFilteredGroups();
                const allTasks = filteredGroups.flatMap(g => g.tasks);
                
                // Extract all persons from tasks
                const personsSet = new Set<string>();
                allTasks.forEach(t => {
                    if (Array.isArray(t.person) && t.person.length > 0) {
                      t.person.forEach(p => personsSet.add(p));
                    } else if (typeof t.person === "string" && t.person) {
                      personsSet.add(t.person);
                    }
                });
                
                if (personsSet.size === 0) {
                    personsSet.add("Unassigned");
                }
                
                const persons = Array.from(personsSet).sort();
                
                // Pastel colors for column headers
                const columnColors = [
                  "bg-green-100/50 text-green-700 border-green-200", 
                  "bg-red-100/50 text-red-700 border-red-200", 
                  "bg-orange-100/50 text-orange-700 border-orange-200", 
                  "bg-blue-100/50 text-blue-700 border-blue-200", 
                  "bg-purple-100/50 text-purple-700 border-purple-200",
                  "bg-yellow-100/50 text-yellow-700 border-yellow-200",
                ];

                return persons.map((person, index) => {
                    const personTasks = allTasks.filter(t => {
                      if (person === "Unassigned") return !t.person || t.person.length === 0;
                      return Array.isArray(t.person) ? t.person.includes(person) : t.person === person;
                    });

                    if (personTasks.length === 0 && person !== "Unassigned") return null;

                    const headerStyle = columnColors[index % columnColors.length];

                    return (
                      <div key={person} className="flex-shrink-0 w-[300px] flex flex-col max-h-full bg-muted/30 rounded-xl border border-border shadow-sm overflow-hidden">
                        
                        {/* Column Header */}
                        <div className={`m-3 px-3 py-2.5 rounded-lg flex items-center gap-2 font-medium border shadow-sm ${headerStyle}`}>
                          <span className="truncate flex-1">{person}</span>
                          <span className="text-xs opacity-80 bg-background/50 px-2 py-0.5 rounded-full">{personTasks.length}</span>
                        </div>
                        
                        {/* Card List */}
                        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                          {personTasks.map(task => {
                              // Find parent group to display group name or icon
                              const parentGroup = groups.find(g => g.tasks.find(t => t.id === task.id) || g.tasks.find(t => t.subitems?.find(s => s.id === task.id)));
                              const groupColor = parentGroup ? (groupColors[parentGroup.id] || parentGroup.color || "#3b82f6") : "#3b82f6";

                              return (
                                <div key={task.id} className="bg-background rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                  
                                  {/* Group Badge or Icon */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: groupColor }}></div>
                                    <h4 className="font-semibold text-sm truncate flex-1 leading-tight">{task.name}</h4>
                                  </div>
                                  
                                  <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
                                    <span className="px-2 py-1 bg-red-100 text-red-700/80 rounded" style={{ backgroundColor: `${groupColor}20`, color: groupColor }}>
                                      {task.status && task.status.length > 0 ? task.status[0] : "Working"}
                                    </span>
                                    {task.estimatedDate && task.estimatedDate !== "-" && (
                                      <span className="text-muted-foreground whitespace-nowrap">{task.estimatedDate}</span>
                                    )}
                                    
                                    <div className="flex-1"></div>

                                    {/* Task Assignees */}
                                    {Array.isArray(task.person) && task.person.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        {task.person.map((p, i) => i < 2 ? (
                                            <span key={p} className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground truncate max-w-[60px]" title={p}>
                                              {p}
                                            </span>
                                        ) : null)}
                                        {task.person.length > 2 && (
                                           <span className="text-muted-foreground text-[10px] ml-1">+{task.person.length - 2}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Subitems Indicator if any */}
                                  {task.subitems && task.subitems.length > 0 && (
                                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                                      <MessageCirclePlus className="w-3 h-3" />
                                      <span>{task.subitems.length} subitems</span>
                                    </div>
                                  )}
                                  
                                </div>
                              );
                          })}

                          {personTasks.length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                               No tasks assigned
                            </div>
                          )}
                        </div>
                      </div>
                    );
                });
              })()}
            </div>
          </div>
        )}

        {/* Other Views */}
        {activeTab !== "Main Table" && activeTab !== "Workload" && activeTab !== "Teams" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Tab: {activeTab}</h2>
              <p className="text-sm text-muted-foreground">
                Workspace: {workspaceName}
              </p>
              <p className="text-sm text-muted-foreground">
                Board ID: {boardId}
              </p>
              <p className="text-sm text-muted-foreground">
                Workspace ID: {workspaceId}
              </p>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Available Tabs:</h3>
                <div className="flex flex-wrap gap-2">
                  {viewTabs.map((tab) => (
                    <span
                      key={tab}
                      className="px-2 py-1 bg-background rounded text-sm"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALL DIALOGS WILL GO HERE */}
      {/* New Group Dialog */}
      <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-lg transition-all border-2 ${
                      newGroupColorInput === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewGroupColorInput(color)}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateGroup();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewGroupDialogOpen(false);
                setNewGroupNameInput("");
                setNewGroupColorInput("#3b82f6");
              }}
              disabled={isCreatingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupNameInput.trim() || isCreatingGroup}
            >
              {isCreatingGroup ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this group? This action cannot be
              undone.
            </p>
            {groupToDelete && (
              <p className="text-sm font-medium mt-2">
                Group:{" "}
                <span className="text-foreground">
                  {groupNames[groupToDelete] || "Unknown"}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteGroupDialogOpen(false);
                setGroupToDelete(null);
              }}
              disabled={isDeletingGroup}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALL SHEETS WILL GO HERE */}
      {/* Comments Panel Sheet */}
      <Sheet
        open={commentsPanelOpen}
        onOpenChange={setCommentsPanelOpen}
        modal={false}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0"
          showOverlay={false}
        >
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold">
                  {selectedTask?.name || "Task Details"}
                </SheetTitle>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <Tabs
              defaultValue="updates"
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-6 border-b border-border">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                  <TabsTrigger
                    value="updates"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dev Updates
                  </TabsTrigger>

                  <TabsTrigger
                    value="client-updates"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Client Updates
                  </TabsTrigger>

                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Log
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="updates"
                className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
              >
                <div className="px-6 pt-2 pb-4 border-b border-border relative z-10">
                  <MentionRichTextEditor
                    placeholder="Write an update and mention others with @"
                    value={updateText}
                    onChange={setUpdateText}
                    availablePeople={[]}
                    files={updateFiles}
                    onFilesChange={setUpdateFiles}
                  />
                </div>
                <div className="flex items-center justify-between px-6 pt-3">
                  <div className="flex items-center gap-2">
                    <FileUploadDropdown
                      onFileSelect={(fileInfo) => {
                        setUpdateFiles((prev) => [...prev, fileInfo]);
                      }}
                    />
                    <GifPicker
                      onGifSelect={(gifUrl) =>
                        setUpdateText(
                          (prev) =>
                            prev +
                            `<img src="${gifUrl}" alt="GIF" style="max-width: 200px; border-radius: 8px;" />`
                        )
                      }
                    />
                    <EmojiPicker
                      onEmojiSelect={(emoji) =>
                        setUpdateText((prev) => prev + emoji)
                      }
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      // onClick={() => mentionEditorRef.current?.showMentionDropdown()}
                    >
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button
                    onClick={saveUpdate}
                    disabled={!updateText.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Update
                  </Button>
                </div>

                <div className="flex-1 overflow-auto px-6 py-4">
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No updates yet. Be the first to add one!
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="activity"
                className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
              >
                <div className="px-6 pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    Activity log for this task will appear here.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* */}
    </div>
  );
}
