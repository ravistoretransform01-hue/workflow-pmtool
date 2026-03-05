import { useState, useEffect } from "react";
import {
  Search,
  Trash2,
  Archive,
  MoreHorizontal,
  X,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/components/ui/tabs";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { trashApi, type TrashTask } from "@/features/trash/trashApi";
import { getOrganizationId } from "@/lib/utils";
import { toast } from "sonner";

export function TrashButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-hover"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      <TrashDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [deletedTasks, setDeletedTasks] = useState<TrashTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Load deleted tasks from API
  useEffect(() => {
    if (!open) return;

    const loadTrashData = async () => {
      setLoading(true);
      try {
        const orgId = getOrganizationId();
        if (!orgId) {
          toast.error("Organization ID not found");
          return;
        }

        const data = await trashApi.getTrash(orgId);
        setDeletedTasks(data.tasks || []);
      } catch (error) {
        console.error("Error loading trash data:", error);
        toast.error("Failed to load trash data");
      } finally {
        setLoading(false);
      }
    };

    loadTrashData();
  }, [open]);

  const filteredTasks = deletedTasks.filter((task) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return task.name.toLowerCase().includes(query);
  });

  const handleDeletePermanently = async () => {
    const selectedTaskIds = Object.keys(selectedItems).filter(
      (id) => selectedItems[id],
    );
    if (selectedTaskIds.length === 0) return;

    setIsDeleting(true);
    try {
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error("Organization ID not found");
        return;
      }

      for (const taskId of selectedTaskIds) {
        await trashApi.deleteTaskPermanently(taskId, orgId);
      }

      toast.success(`${selectedTaskIds.length} Task(s) Deleted Permanently`);
      setDeletedTasks((prev) =>
        prev.filter((task) => !selectedTaskIds.includes(task.id)),
      );
      setSelectedItems({});
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error("Organization ID not found");
        return;
      }

      await trashApi.deleteTaskPermanently(taskId, orgId);
      toast.success("Task Deleted Permanently");
      setDeletedTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-5xl p-0 h-[85vh] max-h-[800px] flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Trash</DialogTitle>
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-3xl font-bold mb-2">Trash</h2>
          <p className="text-sm text-muted-foreground">
            This is your account trash for deleted workspaces, boards, docs,
            dashboards, items and columns.
            <br />
            After 30 days from the deletion date it will be deleted permanently
            and will no longer be accessible.{" "}
          </p>
        </div>

        <Tabs
          defaultValue="trash"
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <div className="px-8 border-b border-border flex-shrink-0">
            <TabsList className="bg-transparent p-0 h-12">
              <TabsTrigger
                value="trash"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Trash
              </TabsTrigger>
              <TabsTrigger
                value="archive"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="trash"
            className="flex-1 flex flex-col m-0 p-0 overflow-hidden min-h-0 data-[state=inactive]:hidden"
          >
            <div className="px-8 py-4  border-border flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search tasks by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Loading trash...
                    </span>
                  </div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery ? "No tasks found" : "No deleted tasks"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? `No tasks matching "${searchQuery}"`
                        : "Your trash is empty"}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header Row */}
                  <div className="flex items-center px-6 py-3 border-b border-border bg-card sticky top-0 z-10">
                    <div className="w-10 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Name
                      </span>
                    </div>
                    <div className="w-32 flex-shrink-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Type
                      </span>
                    </div>
                    <div className="w-48 flex-shrink-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Deleted from
                      </span>
                    </div>
                    <div className="w-40 flex-shrink-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Deleted by
                      </span>
                    </div>
                    <div className="w-32 flex-shrink-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Date
                      </span>
                    </div>
                    <div className="hidden w-20 flex-shrink-0 px-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Action
                      </span>
                    </div>
                  </div>

                  {/* List Items */}
                  <div className="divide-y divide-border">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center px-6 py-4 hover:bg-hover/50 transition-colors"
                      >
                        <div className="w-10 flex-shrink-0">
                          <Checkbox
                            checked={selectedItems[task.id] || false}
                            onCheckedChange={(checked) =>
                              setSelectedItems((prev) => ({
                                ...prev,
                                [task.id]: checked as boolean,
                              }))
                            }
                            className="rounded-md"
                          />
                        </div>
                        <div className="flex-1 min-w-0 px-3">
                          <p className="font-medium truncate">{task.name}</p>
                        </div>
                        <div className="w-32 flex-shrink-0 px-3">
                          <span className="text-sm text-muted-foreground">
                            Task
                          </span>
                        </div>
                        <div className="w-48 flex-shrink-0 px-3">
                          <span className="text-sm text-muted-foreground truncate block">
                            {task.board_name}
                          </span>
                        </div>
                        <div className="w-40 flex-shrink-0 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {getInitials(task.creator_name || "Unknown")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate">
                              {task.creator_name || "Unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="w-32 flex-shrink-0 px-3">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(task.deleted_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="hidden w-20 flex-shrink-0 px-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled onClick={() => {}}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                <span>Restore</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                <span>Delete Permanently</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="archive"
            className="flex-1 flex flex-col m-0 p-0 overflow-hidden min-h-0 data-[state=inactive]:hidden"
          >
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <div className="text-center">
                <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No archived items
                </h3>
                <p className="text-muted-foreground">
                  Archived items will appear here
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bulk Actions Toolbar */}
        {selectedCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#1e293b] border-t border-[#334155] shadow-lg py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold text-sm">
                  {selectedCount}
                </div>
                <span className="text-white font-medium">Items selected</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {}}
                  disabled
                  className="flex items-center gap-2 text-white transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Restore</span>
                </button>

                <button
                  onClick={handleDeletePermanently}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>Delete Permanently</span>
                </button>

                <button
                  onClick={() => setSelectedItems({})}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-white transition-colors ml-4 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
