import { useState, useEffect } from "react";
import { X, ChevronRight, Mail, MessageSquare, AtSign, Paperclip, Smile } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import type { Task } from "@/shared/components/workload/WorkloadBoard";
import type { Status, Priority } from "@/features/cms/types";
import { getWorkloadColumns } from "./WorkloadColumns";
import { DialogTitle } from "@radix-ui/react-dialog";

interface TaskCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  boardName?: string;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  onStatusChange?: (taskId: string, statusId: string) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  onEstimatedDateChange?: (taskId: string, fromDate: string | null, toDate?: string | null) => void;
}

export function TaskCardDialog({
  open,
  onOpenChange,
  task,
  boardName = "Board",
  statuses = [],
  priorities = [],
  members = [],
  onStatusChange,
  onPriorityChange,
  onPersonChange,
  onRatingChange,
  onEstimatedDateChange,
}: TaskCardDialogProps) {
  const [activeTab, setActiveTab] = useState("dev-updates");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedTasks] = useState<Record<string, boolean>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("dev-updates");
      setOpenPopoverId(null);
    }
  }, [open]);

  if (!task) return null;

  // Use task directly - it will update in real-time from parent
  const displayTask = task;

  // Get columns with all the interactive components
  const columns = getWorkloadColumns({
    expandedTasks,
    toggleTask: () => {},
    statuses,
    priorities,
    members,
    onStatusChange,
    onPriorityChange,
    onPersonChange,
    onRatingChange,
    onEstimatedDateChange,
    openPopoverId,
    setOpenPopoverId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-5xl p-0 h-[85vh] max-h-[800px] flex flex-col" hideCloseButton>
        {/* Header */}
        <DialogTitle className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{displayTask?.name}</h2>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              in <ChevronRight className="h-3 w-3" /> <span className="text-blue-500 font-medium">{boardName}</span> Board
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogTitle>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Fields */}
          <div className="w-1/2 border-r border-border overflow-auto p-3 pt-2">
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Status
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "status")?.render(displayTask)} 
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Priority
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "priority")?.render(displayTask)}
                </div>
              </div>

              

              {/* People */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  People
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "person")?.render(displayTask)}
                </div>
              </div>

              {/* Estimated Date */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Timeline
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "estimatedDate")?.render(displayTask)}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Rating
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "rating")?.render(displayTask)}
                </div>
              </div>

              {/* Description */}
              {displayTask?.description && (
                <div className="mt-2">
                  <label className="text-sm font-semibold text-foreground">
                    Description
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {displayTask?.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Updates Section */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3 py-0">
                <TabsTrigger value="dev-updates" className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Mail className="h-4 w-4" />
                  Dev Updates
                </TabsTrigger>
                <TabsTrigger value="client-updates" className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Mail className="h-4 w-4" />
                  Client Updates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dev-updates" className="flex-1 overflow-hidden m-0 p-0">
                <div className="flex flex-col h-full p-2">
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>Update via email</span>
                    <span className="mx-1">|</span>
                    <MessageSquare className="h-3 w-3" />
                    <span>Give feedback</span>
                  </div>
                  <div className="bg-muted rounded-lg p-2 flex flex-col flex-1">
                    <div className="min-h-[60px] text-xs text-muted-foreground">
                      Write an update and mention others with @
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <AtSign className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Paperclip className="h-3 w-3" />
                        </Button>
                        <span className="text-muted-foreground text-xs">GIF</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Smile className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    View updates for this task
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="client-updates" className="flex-1 overflow-hidden m-0">
                <div className="flex flex-col h-full p-2">
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>Update via email</span>
                    <span className="mx-1">|</span>
                    <MessageSquare className="h-3 w-3" />
                    <span>Give feedback</span>
                  </div>
                  <div className="bg-muted rounded-lg p-2 flex flex-col flex-1">
                    <div className="min-h-[60px] text-xs text-muted-foreground">
                      Write an update and mention others with @
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <AtSign className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Paperclip className="h-3 w-3" />
                        </Button>
                        <span className="text-muted-foreground text-xs">GIF</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Smile className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    View updates for this task
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
