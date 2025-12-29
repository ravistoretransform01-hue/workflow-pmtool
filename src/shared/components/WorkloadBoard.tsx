import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

interface WorkloadBoardProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceName: string;
}

const DEFAULT_TABS = [
  "Main Table",
  "List",
  "Kanban",
  "Calendar",
  "Workload",
  "Time",
  "Recurring",
  "Completed",
  "Gantt",
  "SOP",
  "Doc",
  "Updates",
  "Dashboard"
];

// Sortable Tab Component
interface SortableViewTabProps {
  tab: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
}

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
      type: 'tab',
    }
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
  
  // Load saved tab order from localStorage
  const [viewTabs, setViewTabs] = useState(() => {
    const savedTabs = localStorage.getItem(`board-tabs-${boardId}`);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        // Ensure all default tabs exist in saved order
        const allTabs = [...new Set([...parsed, ...DEFAULT_TABS])];
        return allTabs.filter(tab => DEFAULT_TABS.includes(tab));
      } catch {
        return DEFAULT_TABS;
      }
    }
    return DEFAULT_TABS;
  });

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
                    <span className="text-white text-xs font-semibold">
                      U
                    </span>
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
            <SortableContext items={viewTabs} strategy={horizontalListSortingStrategy}>
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
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Tab: {activeTab}</h2>
          <p className="text-sm text-muted-foreground">Workspace: {workspaceName}</p>
          <p className="text-sm text-muted-foreground">Board ID: {boardId}</p>
          <p className="text-sm text-muted-foreground">Workspace ID: {workspaceId}</p>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Available Tabs:</h3>
            <div className="flex flex-wrap gap-2">
              {viewTabs.map((tab) => (
                <span key={tab} className="px-2 py-1 bg-background rounded text-sm">
                  {tab}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
