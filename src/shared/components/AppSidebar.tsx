import { useState, useEffect } from "react";
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
  BarChart3,
  Home,
  FolderKanban,
  Briefcase,
  Plus,
  Search,
  FileText,
  Folder,
  LayoutDashboard,
  Copy,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useBoards } from "@/hooks/useBoards";
import { boardsApi } from "@/features/boards/boardsApi";
import { getOrganizationId } from "@/lib/utils";

export const AppSidebar = () => {
  const navigate = useNavigate();
  const { open } = useSidebar();
  const { boards, fetchLoading, fetchBoards } = useBoards();
  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [boardSearchOpen, setBoardSearchOpen] = useState(false);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingBoardName, setRenamingBoardName] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [deletingBoardName, setDeletingBoardName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch boards on component mount
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Mock data - replace with API calls
  const [selectedWorkspace] = useState("1");
  const [workspaces] = useState([
    {
      id: "1",
      name: "Default Workspace",
      documents: [
        { id: "d1", title: "Documentation" },
        { id: "d2", title: "Guidelines" },
      ],
      folders: [
        {
          id: "f1",
          name: "Q1 Projects",
          boards: [],
        },
      ],
    },
  ]);

  const mainMenuItems = [
    { icon: Home, label: "Dashboard", href: "/home" },
    { icon: FolderKanban, label: "All Items", href: "/all-items" },
    { icon: Briefcase, label: "My Habits", href: "/my-habits" },
  ];

  const currentWorkspace = workspaces.find((ws) => ws.id === selectedWorkspace);
  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(boardSearchQuery.toLowerCase())
  );

  const handleAddBoard = () => {
    if (!newBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }
    toast.success(`Board "${newBoardName}" created`);
    setNewBoardName("");
    setAddBoardOpen(false);
    setAddMenuOpen(false);
    // Refresh boards list
    fetchBoards();
  };

  const handleCreateDoc = () => {
    if (!newDocName.trim()) {
      toast.error("Document name is required");
      return;
    }
    toast.success(`Document "${newDocName}" created`);
    setNewDocName("");
    setCreateDocOpen(false);
    setAddMenuOpen(false);
  };

  const handleOpenBoardInNewTab = (boardId: string) => {
    window.open(`/board/${boardId}`, "_blank");
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

      toast.success(`Board renamed to "${renamingBoardName}"`);
      setRenamingBoardId(null);
      setRenamingBoardName("");
      
      // Refresh boards list to reflect the change in UI
      fetchBoards();
    } catch (error) {
      console.error("Rename board error:", error);
      toast.error("Failed to rename board");
    }
  };

  const handleDuplicateBoard = (_boardId: string, boardName: string) => {
    // TODO: Call API to duplicate board with _boardId
    toast.success(`Board "${boardName}" duplicated`);
    fetchBoards();
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
      toast.success(`Board "${deletingBoardName}" deleted successfully`);
      setDeletingBoardId(null);
      setDeletingBoardName("");
      fetchBoards();
    } catch (error: any) {
      console.error("Delete board error:", error);
      toast.error(error.response?.data?.message || "Failed to delete board");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            {open && <h1 className="font-bold text-lg">PM Tool</h1>}
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

        {/* Workspace Selector & Add Menu */}
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
                  <div
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
                  </div>

                  {/* Document Submenu */}
                  <div
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
                  </div>

                  {/* Folder */}
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-hover hover:text-foreground transition-colors text-left">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>Folder</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </SidebarGroup>

        {/* Boards & Documents */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Search Boards */}
              <SidebarMenuItem>
                <button
                  onClick={() => setBoardSearchOpen(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-hover text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>Search boards...</span>
                </button>
              </SidebarMenuItem>

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
                    <div className="flex items-center gap-1 w-full group px-2 py-1.5 rounded-md hover:bg-hover">
                      <button
                        onClick={() => navigate(`/board/${board.id}`)}
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
                        <DropdownMenuContent align="end" className="w-48">
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
                          >
                            <Copy className="h-4 w-4 mr-2" />
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

              {/* Documents */}
              {currentWorkspace?.documents.map((doc) => (
                <SidebarMenuItem key={doc.id}>
                  <SidebarMenuButton asChild>
                    <button className="flex items-center gap-2 w-full text-left">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Folders */}
              {currentWorkspace?.folders.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton asChild>
                    <button className="flex items-center gap-2 w-full text-left">
                      <Folder className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
        onAddBoard={handleAddBoard}
        // templateId={selectedTemplateId}
        organizationId={getOrganizationId() || -1}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      navigate(`/board/${board.id}`);
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
  );
};
