import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { AddBoardDialog } from "@/shared/components/AddBoardDialog";
import {
  Home,
  FolderKanban,
  Briefcase,
  Plus,
  Search,
  LayoutDashboard,
  Copy,
  Loader2,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
  // User,
} from "lucide-react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useBoards } from "@/hooks/useBoards";
import { boardsApi } from "@/features/boards/boardsApi";
import { useAppSelector } from "@/app/hooks";
import { appName } from "@/lib/constants";

import { Logo } from "@/shared/components/Logo";

export const AppSidebar = () => {
  const user = useAppSelector((state) => state.auth.user);
  const orgId = user?.organization_id;

  const navigate = useNavigate();
  const { boardId } = useParams();
  const { open } = useSidebar();
  const { boards, fetchLoading, fetchBoards } = useBoards();

  // Resize logic
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar_width");
    return saved ? parseInt(saved, 10) : 260; // Default to 260px (approx 16rem)
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      setSidebarWidth((prev) => {
        const newWidth = prev + e.movementX;
        return Math.min(Math.max(260, newWidth), 500);
      });
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  // Sync with global CSS variable so the whole layout reacts
  useEffect(() => {
    const provider = document.querySelector(
      ".group\\/sidebar-wrapper",
    ) as HTMLElement;
    if (provider) {
      provider.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    }
    localStorage.setItem("sidebar_width", sidebarWidth.toString());
  }, [sidebarWidth]);

  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  // const [, setNewBoardName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [boardSearchOpen, setBoardSearchOpen] = useState(false);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingBoardName, setRenamingBoardName] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [deletingBoardName, setDeletingBoardName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Fetch boards when organization changes or component mounts
  useEffect(() => {
    if (orgId) {
      fetchBoards();
    }
  }, [orgId, fetchBoards]);

  const mainMenuItems = [
    { icon: Home, label: "Dashboard", href: `/org/${orgId}/home` },
    { icon: FolderKanban, label: "All Items", href: `/org/${orgId}/all-items` },
    { icon: Briefcase, label: "My Habits", href: `/org/${orgId}/my-habits` },
    // { icon: User, label: "Profile", href: `/org/${orgId}/profile` },
  ];

  // const currentBoard = boards.find((b) => b.id === boardId);
  // const currentBoardName = currentBoard?.name || "Workspace";
  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(boardSearchQuery.toLowerCase()),
  );

  // const handleAddBoard = () => {
  //   // if (!newBoardName.trim()) {
  //   //   toast.error("Board name is required");
  //   //   return;
  //   // }
  //   // toast.success(`Board "${newBoardName}" created`);
  //   setNewBoardName("");
  //   setAddBoardOpen(false);
  //   setAddMenuOpen(false);
  //   // Refresh boards list
  //   fetchBoards();
  // };

  const handleCreateDoc = () => {
    if (!newDocName.trim()) {
      toast.error("Document name is required");
      return;
    }
    toast.success(`Document "${newDocName}" Created`);
    setNewDocName("");
    setCreateDocOpen(false);
    setAddMenuOpen(false);
  };

  const handleOpenBoardInNewTab = (boardId: string) => {
    window.open(`/org/${orgId}/board/${boardId}/view/Main%20Table`, "_blank");
  };

  const handleRenameBoard = (boardId: string, currentName: string) => {
    setRenamingBoardId(boardId);
    setRenamingBoardName(currentName);
  };

  const handleSaveRename = async () => {
    if (!renamingBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      // Call API to rename board
      await boardsApi.updateBoard(renamingBoardId!, {
        name: renamingBoardName.trim(),
      });

      toast.success(`Board Renamed to "${renamingBoardName}"`);

      // Notify any open WorkloadBoard to update its displayed name
      window.dispatchEvent(
        new CustomEvent("board-renamed", {
          detail: {
            boardId: renamingBoardId,
            newName: renamingBoardName.trim(),
          },
        }),
      );

      setRenamingBoardId(null);
      setRenamingBoardName("");

      // Refresh boards list to reflect the change in UI
      fetchBoards();
    } catch (error) {
      console.error("Rename board error:", error);
      toast.error("Failed to rename board");
    }
  };

  const handleDuplicateBoard = async (boardId: string, boardName: string) => {
    setIsDuplicating(true);
    const toastId = toast.loading(`Duplicating board "${boardName}"...`);
    try {
      const response = await boardsApi.cloneBoard(boardId);
      if (response.status === "success") {
        toast.success(`Board "${boardName}" duplicated successfully`, {
          id: toastId,
        });
        fetchBoards();
      } else {
        toast.error(response.message || "Failed to duplicate board", {
          id: toastId,
        });
      }
    } catch (error: any) {
      console.error("Duplicate board error:", error);
      toast.error("An error occurred while duplicating the board", {
        id: toastId,
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteBoard = (boardId: string, boardName: string) => {
    setDeletingBoardId(boardId);
    setDeletingBoardName(boardName);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBoardId) return;

    setIsDeleting(true);
    try {
      await boardsApi.deleteBoard(deletingBoardId);
      toast.success(`Board "${deletingBoardName}" Deleted Successfully`);

      // Navigate away only if the deleted board is the one currently open
      if (boardId && String(deletingBoardId) === String(boardId)) {
        navigate(`/org/${orgId}/home`);
      }

      setDeletingBoardId(null);
      setDeletingBoardName("");
      fetchBoards();
    } catch (error: any) {
      console.error("Delete board error:", error);
      toast.error(error.response?.data?.message || "Failed to Delete Board");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {isResizing && (
        <style>
          {`
            .group\\/sidebar-wrapper *,
            .group\\/sidebar-wrapper {
              transition: none !important;
            }
          `}
        </style>
      )}
      <Sidebar 
        className={cn("z-20", isResizing && "transition-none")}
        style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors hover:bg-blue-500/30 group/sidebar-handle",
          isResizing ? "bg-blue-500/50 w-1.5" : ""
        )}
        onMouseDown={startResizing}
      >
        <div className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-l-md bg-blue-500/50 opacity-0 transition-all group-hover/sidebar-handle:opacity-100",
          isResizing ? "opacity-100 h-24 w-2" : ""
        )} />
      </div>
      <SidebarHeader className="h-16 flex items-center justify-center">
        <div className="flex items-center justify-between gap-2 w-full px-6">
          <div className="flex items-center gap-2">
            <Logo size={32} rounded="rounded-md" bgColor="bg-white" />
            {open && <h1 className="text-lg">{appName}</h1>}
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

        <SidebarContent className="p-4">
          {/* Main Navigation */}
          <SidebarGroup>
            {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
            <SidebarGroupContent>
              <SidebarMenu>
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center gap-2 ${isActive ? "bg-hover" : ""}`
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="hidden">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="  hover:bg-red-500/30"
                    onClick={() =>
                      window.open(
                        "https://www.loom.com/share/0355f68386c544959b6247d9c7750e9e",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="italic">Working Model</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="  hover:bg-red-500/30"
                    onClick={() =>
                      window.open(
                        "https://www.canva.com/design/DAG_9fIOItw/idRFofw2acd1HKW7AsL1eQ/view",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="italic">Tool Guide</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        {/* Workspace Selector & Add Menu */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-0">
            <SidebarGroupLabel className="font-bold text-white text-lg">
              Projects
            </SidebarGroupLabel>
            <div className="flex items-center gap-1">
              <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="default" size="sm" className="h-6 w-6 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setAddMenuOpen(false);
                        setAddBoardOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-transparent hover:bg-accent hover:text-white transition-colors text-left cursor-pointer text-white"
                    >
                      <LayoutDashboard className="h-4 w-4 text-white" />
                      <span>New Project</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-transparent hover:bg-accent hover:text-white transition-colors text-left cursor-pointer text-white">
                      <Copy className="h-4 w-4 text-white" />
                      <span>Start with template</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setBoardSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarGroup>

        {/* COMMENTED OUT: Nested popover structure - may be useful in the future */}
        {/* 
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>
              {currentWorkspace?.name || "Workspace"}
            </SidebarGroupLabel>
            <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {/* Board Submenu */}
        {/* <div
                    className="relative"
                    onMouseEnter={() => setHoveredSubmenu("board")}
                    onMouseLeave={() => setHoveredSubmenu(null)}
                  >
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        <span>Project</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {hoveredSubmenu === "board" && (
                      <div className="absolute left-full top-0 ml-1 w-56 p-2 bg-popover rounded-md border shadow-md z-50">
                        <button
                          onClick={() => {
                            setAddMenuOpen(false);
                            setHoveredSubmenu(null);
                            setAddBoardOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left"
                        >
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                          <span>New Project</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          <span>Start with template</span>
                        </button>
                      </div>
                    )}
                  </div> */}

        {/* Document Submenu */}
        {/* <div
                    className="relative"
                    onMouseEnter={() => setHoveredSubmenu("doc")}
                    onMouseLeave={() => setHoveredSubmenu(null)}
                  >
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Doc</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {hoveredSubmenu === "doc" && (
                      <div className="absolute left-full top-0 ml-1 w-56 p-2 bg-popover rounded-md border shadow-md z-50">
                        <button
                          onClick={() => {
                            setAddMenuOpen(false);
                            setHoveredSubmenu(null);
                            setCreateDocOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>New Doc</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          <span>Start with template</span>
                        </button>
                      </div>
                    )}
                  </div> */}

        {/* Folder */}
        {/* <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>Folder</span>
                  </button> */}
        {/* </div>
              </PopoverContent>
            </Popover>
          </div>
        </SidebarGroup>
        */}

        {/* Boards & Documents */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Loading State */}
              {fetchLoading && (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading boards...</span>
                  </div>
                </SidebarMenuItem>
              )}

              {/* Boards from API */}
              {!fetchLoading && boards.length > 0 ? (
                boards.map((board) => (
                  <SidebarMenuItem key={board.id} className="p-0">
                    <div
                      className={`flex items-center gap-1 w-full group px-2 py-1.5 rounded-md ${boardId === board.id ? "bg-accent" : "hover:bg-hover"}`}
                    >
                      <button
                        onClick={() =>
                          navigate(
                            `/org/${orgId}/board/${board.id}/view/Main%20Table`,
                          )
                        }
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                        title={board.name}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm overflow-hidden text-ellipsis">
                          {board.name}
                        </span>
                      </button>

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-md flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleOpenBoardInNewTab(board.id)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            <span>Open in new tab</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              handleRenameBoard(board.id, board.name)
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            <span>Rename</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              handleDuplicateBoard(board.id, board.name)
                            }
                            disabled={isDuplicating}
                          >
                            {isDuplicating ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4 mr-2" />
                            )}
                            <span>Duplicate</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteBoard(board.id, board.name)
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            <span>Delete Project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                ))
              ) : !fetchLoading && boards.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No boards available
                  </div>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Add Board Dialog */}
      <AddBoardDialog
        open={addBoardOpen}
        onOpenChange={(open) => {
          setAddBoardOpen(open);
          // if (!open) {
          //   setSelectedTemplateId(null); // Reset template when dialog closes
          // }
        }}
        onBoardCreated={fetchBoards}
        // templateId={selectedTemplateId}
        organizationId={Number(orgId) || -1}
      />

      {/* Add Board Dialog */}
      {/* <Dialog open={addBoardOpen} onOpenChange={setAddBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddBoardOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBoard}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog> */}

      {/* Create Document Dialog */}
      <Dialog open={createDocOpen} onOpenChange={setCreateDocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Document name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDocOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDoc}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Board Search Dialog */}
      <Dialog open={boardSearchOpen} onOpenChange={setBoardSearchOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Search Boards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <Input
                placeholder="Search boards..."
                value={boardSearchQuery}
                onChange={(e) => setBoardSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredBoards.length > 0 ? (
                filteredBoards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => {
                      navigate(
                        `/org/${orgId}/board/${board.id}/view/Main%20Table`,
                      );
                      setBoardSearchOpen(false);
                      setBoardSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent rounded-lg transition-colors text-left"
                  >
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: board.icon_color }}
                    >
                      {board.icon_value || board.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">
                        {board.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Workspace {board.workspace_id}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {boardSearchQuery
                    ? "No boards found"
                    : "Start typing to search boards"}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Board Dialog */}
      <Dialog
        open={!!renamingBoardId}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingBoardId(null);
            setRenamingBoardName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Board name"
              value={renamingBoardName}
              onChange={(e) => setRenamingBoardName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenamingBoardId(null);
                  setRenamingBoardName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSaveRename()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Board Confirmation Dialog */}
      <Dialog
        open={!!deletingBoardId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingBoardId(null);
            setDeletingBoardName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingBoardName}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingBoardId(null);
                  setDeletingBoardName("");
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
    </>
  );
};
