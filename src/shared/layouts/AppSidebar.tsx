import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/utils/utils";
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
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from "@/shared/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { AddBoardDialog } from "@/shared/modals/AddBoardDialog";
import {
  Home,
  FolderKanban,
  // Briefcase,
  Plus,
  Search,
  LayoutDashboard,
  Copy,
  Loader2,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronsLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";
import { NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useBoards } from "@/hooks/useBoards";
import { boardsApi } from "@/features/boards/api/boardsApi";
import { groupsApi } from "@/features/groups/api/groupsApi";
import type { Group } from "@/features/groups/types/types";
import { useAppSelector } from "@/hooks";
import { appName } from "@/constants";
import { getCMSData } from "@/features/cms/services/cmsStorage";
import { DeleteBoardDialog } from "@/shared/modals/DeleteBoardDialog";

export const AppSidebar = () => {
  const user = useAppSelector((state) => state.auth.user);
  const orgId = user?.organization_id;

  const currentOrg = user?.organizations?.find(
    (o) => String(o.organization_id) === String(orgId),
  );
  const displayName = currentOrg?.organization_name || appName;

  const navigate = useNavigate();
  const location = useLocation();
  const { boardId, viewName } = useParams<{
    boardId?: string;
    viewName?: string;
  }>();

  const currentView = useMemo(() => {
    const match = location.pathname.match(/\/view\/([^/#?]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    if (viewName) {
      return decodeURIComponent(viewName);
    }
    return String(orgId) === "27" ? "Kanban" : "Main Table";
  }, [location.pathname, viewName, orgId]);

  const { toggleSidebar } = useSidebar();
  const { boards, fetchLoading, fetchBoards } = useBoards();

  const [expandedBoardIds, setExpandedBoardIds] = useState<
    Set<string | number>
  >(new Set());
  const [boardGroups, setBoardGroups] = useState<Record<string, Group[]>>({});
  const boardGroupsRef = useRef<Record<string, Group[]>>({});
  boardGroupsRef.current = boardGroups;
  const inFlightBoardGroups = useRef<Set<string>>(new Set());

  const [loadingGroups, setLoadingGroups] = useState<
    Record<string, boolean>
  >({});
  const [groupSearchQueries, setGroupSearchQueries] = useState<
    Record<string, string>
  >({});

  const expandBoard = useCallback(
    async (targetBoardId: string | number) => {
      const key = String(targetBoardId);
      setExpandedBoardIds((prev) => {
        if (prev.has(targetBoardId)) return prev;
        const next = new Set(prev);
        next.add(targetBoardId);
        return next;
      });

      // Avoid re-fetching if already loaded or currently being fetched
      if (boardGroupsRef.current[key] || inFlightBoardGroups.current.has(key)) {
        return;
      }

      inFlightBoardGroups.current.add(key);
      setLoadingGroups((prev) => ({ ...prev, [key]: true }));
      try {
        const groups = await groupsApi.getGroupsByBoard(Number(targetBoardId));
        const sortedGroups = Array.isArray(groups)
          ? [...groups].sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, {
                sensitivity: "base",
              }),
            )
          : [];
        setBoardGroups((prev) => ({ ...prev, [key]: sortedGroups }));
      } catch (err) {
        console.error("Failed to load groups for board:", err);
        toast.error("Failed to load groups");
      } finally {
        inFlightBoardGroups.current.delete(key);
        setLoadingGroups((prev) => ({ ...prev, [key]: false }));
      }
    },
    [],
  );

  const toggleBoardExpand = useCallback(
    async (targetBoardId: string | number) => {
      const key = String(targetBoardId);
      if (expandedBoardIds.has(targetBoardId)) {
        setExpandedBoardIds((prev) => {
          const next = new Set(prev);
          next.delete(targetBoardId);
          return next;
        });
        setGroupSearchQueries((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        await expandBoard(targetBoardId);
      }
    },
    [expandedBoardIds, expandBoard],
  );

  // Auto-expand board groups when current active boardId is present
  useEffect(() => {
    if (boardId) {
      expandBoard(boardId);
    }
  }, [boardId, expandBoard]);

  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);

  // Fetch dynamic logo from CMS (cached via getCMSData)
  useEffect(() => {
    let isMounted = true;
    const fetchLogo = async () => {
      if (orgId) {
        try {
          const res = await getCMSData({
            organization_id: Number(orgId),
            board_id: Number(boardId) || 0,
            user_id: user?.user_id ? Number(user.user_id) : null,
          });
          const logo = res.ord_logo || res.org_logo;
          if (logo && isMounted) setDynamicLogo(logo);
        } catch (error) {
          console.error("Failed to fetch dynamic logo from CMS:", error);
        }
      }
    };
    fetchLogo();
    return () => {
      isMounted = false;
    };
  }, [orgId, boardId, user?.user_id]);

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
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Fetch boards when organization changes or component mounts
  useEffect(() => {
    if (orgId) {
      fetchBoards();
    }
  }, [orgId, fetchBoards]);

  const mainMenuItems = [
    {
      icon: Home,
      label: "Dashboard",
      href: `/org/${orgId}/home`,
      isImplemented: false,
    },
    {
      icon: FolderKanban,
      label: "All Items",
      href: `/org/${orgId}/all-items`,
      isImplemented: false,
    },
    // { icon: Briefcase, label: "My Habits", href: `/org/${orgId}/my-habits`, isImplemented: false },
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
    } catch (error: any) {
      console.error("Rename board error:", error);
      toast.error(error?.response?.data?.message || "Failed to rename board");
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
      toast.error(
        error?.response?.data?.message ||
          "An error occurred while duplicating the board",
        {
          id: toastId,
        },
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteBoard = (boardId: string, boardName: string) => {
    setDeletingBoardId(boardId);
    setDeletingBoardName(boardName);
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
        collapsible="icon"
        className={cn("z-20", isResizing && "transition-none")}
        style={
          { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
        }
      >
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors hover:bg-blue-500/30 group/sidebar-handle",
            isResizing ? "bg-blue-500/50 w-1.5" : "",
          )}
          onMouseDown={startResizing}
        >
          <div
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-l-md bg-blue-500/50 opacity-0 transition-all group-hover/sidebar-handle:opacity-100",
              isResizing ? "opacity-100 h-24 w-2" : "",
            )}
          />
        </div>
        <SidebarHeader className="h-16 flex items-center justify-center p-0 border-b border-sidebar-border">
          <div className="flex items-center justify-between w-full h-full px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <img
                src={
                  dynamicLogo ||
                  user?.organizations?.find(
                    (o) =>
                      String(o.organization_id) ===
                      String(user?.organization_id),
                  )?.org_logo ||
                  user?.org_logo ||
                  "/favicon/apple-touch-icon.png"
                }
                alt="Logo"
                className="w-8 h-8 rounded-md object-contain shrink-0"
                style={{ padding: "2px" }}
                onError={(e) => {
                  e.currentTarget.src = "/favicon/apple-touch-icon.png";
                }}
              />
              <h1
                className="text-lg font-semibold overflow-hidden text-ellipsis whitespace-nowrap group-data-[collapsible=icon]:hidden"
                title={displayName}
              >
                {displayName}
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 text-muted-foreground transition-all shrink-0 group-data-[collapsible=icon]:hidden"
              title="Toggle Sidebar"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="gap-0 py-2">
          {/* Main Navigation */}
          <SidebarGroup>
            {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
            <SidebarGroupContent>
              <SidebarMenu>
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      {item.isImplemented !== false ? (
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-2 ${isActive ? "bg-hover" : ""}`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      ) : (
                        <NavLink
                          to={item.href}
                          className="flex items-center gap-2 px-2 py-1.5 text-amber-400/80 w-full"
                          title="Coming Soon"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      )}
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
              <SidebarGroupLabel className="font-bold text-foreground text-lg">
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
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-transparent hover:bg-accent hover:text-foreground transition-colors text-left cursor-pointer text-foreground"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>New Project</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-transparent hover:bg-accent hover:text-foreground transition-colors text-left cursor-pointer text-foreground">
                        <Copy className="h-4 w-4" />
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
                  boards.map((board) => {
                    const isExpanded = expandedBoardIds.has(board.id);
                    const groups = boardGroups[String(board.id)];
                    const isGroupsLoading = loadingGroups[String(board.id)];
                    const groupSearch = groupSearchQueries[String(board.id)] || "";
                    const sortedGroups = groups
                      ? [...groups].sort((a, b) =>
                          (a.name || "").localeCompare(b.name || "", undefined, {
                            sensitivity: "base",
                          }),
                        )
                      : [];
                    const filteredGroups =
                      !groupSearch.trim() || sortedGroups.length <= 10
                        ? sortedGroups
                        : sortedGroups.filter((g) =>
                            (g.name || "")
                              .toLowerCase()
                              .includes(groupSearch.trim().toLowerCase()),
                          );

                    return (
                      <SidebarMenuItem key={board.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={boardId === board.id}
                          tooltip={board.name}
                        >
                          <div
                            onClick={() => {
                              const encodedView = encodeURIComponent(currentView);
                              const targetPath = `/org/${orgId}/board/${board.id}/view/${encodedView}`;
                              if (location.pathname !== targetPath) {
                                navigate(targetPath);
                              }
                              expandBoard(board.id);
                            }}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBoardExpand(board.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  toggleBoardExpand(board.id);
                                }
                              }}
                              className="h-5 w-5 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0 transition-all cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95"
                              style={{
                                backgroundColor:
                                  board.icon_color || "hsl(221, 83%, 53%)",
                              }}
                              title={
                                isExpanded ? "Collapse groups" : "Expand groups"
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-white" />
                              ) : (
                                <>
                                  <span className="group-hover/menu-item:hidden group-data-[collapsible=icon]:!inline-block">
                                    {(board.name || "B").charAt(0).toUpperCase()}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-white hidden group-hover/menu-item:block group-data-[collapsible=icon]:!hidden" />
                                </>
                              )}
                            </div>
                            <span className="truncate flex-1">{board.name}</span>
                          </div>
                        </SidebarMenuButton>

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal className="h-4 w-4" />
                            </SidebarMenuAction>
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

                        {/* Expanded Groups Submenu */}
                        {isExpanded && (
                          <SidebarMenuSub className="my-1 space-y-0.5">
                            {isGroupsLoading ? (
                              <SidebarMenuSubItem>
                                <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Loading groups...</span>
                                </div>
                              </SidebarMenuSubItem>
                            ) : groups && groups.length > 0 ? (
                              <>
                                {/* Search bar for groups in this project/board (visible only if more than 10 groups) */}
                                {groups.length > 10 && (
                                  <SidebarMenuSubItem className="pb-1 pt-0.5">
                                    <div className="relative flex items-center w-full">
                                      <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                                      <input
                                        type="text"
                                        value={groupSearch}
                                        onChange={(e) =>
                                          setGroupSearchQueries((prev) => ({
                                            ...prev,
                                            [String(board.id)]: e.target.value,
                                          }))
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Search groups..."
                                        className="w-full h-7 pl-7 pr-6 text-xs rounded-md bg-muted/40 hover:bg-muted/60 focus:bg-background border border-sidebar-border/60 focus:border-primary/50 focus:outline-none placeholder:text-muted-foreground/60 transition-colors"
                                      />
                                      {groupSearch && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setGroupSearchQueries((prev) => ({
                                              ...prev,
                                              [String(board.id)]: "",
                                            }));
                                          }}
                                          className="absolute right-1.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                          title="Clear search"
                                          aria-label="Clear group search"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </SidebarMenuSubItem>
                                )}

                                {filteredGroups.length > 0 ? (
                                  filteredGroups.map((group) => (
                                    <SidebarMenuSubItem key={group.id}>
                                      <SidebarMenuSubButton
                                        asChild
                                        size="sm"
                                        className="h-7 text-xs hover:bg-sidebar-accent cursor-pointer"
                                      >
                                        <div
                                          onClick={() => {
                                            const targetId = `group-${group.id}`;
                                            const encodedView = encodeURIComponent(currentView);
                                            const targetPath = `/org/${orgId}/board/${board.id}/view/${encodedView}`;

                                            if (String(boardId) === String(board.id)) {
                                              if (
                                                location.pathname !== targetPath ||
                                                window.location.hash !== `#${targetId}`
                                              ) {
                                                navigate(`${targetPath}#${targetId}`, { replace: true });
                                              }
                                              if (currentView === "Main Table") {
                                                const el = document.getElementById(targetId);
                                                if (el) {
                                                  el.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "start",
                                                  });
                                                }
                                              }
                                            } else {
                                              navigate(`${targetPath}#${targetId}`);
                                            }
                                          }}
                                          className="flex items-center gap-2 w-full text-left truncate cursor-pointer"
                                          title={group.name}
                                        >
                                          <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{
                                              backgroundColor:
                                                group.color || "#3b82f6",
                                            }}
                                          />
                                          <span className="truncate">
                                            {group.name}
                                          </span>
                                        </div>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))
                                ) : (
                                  <SidebarMenuSubItem>
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic flex items-center justify-between">
                                      <span>No matching groups</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setGroupSearchQueries((prev) => ({
                                            ...prev,
                                            [String(board.id)]: "",
                                          }));
                                        }}
                                        className="text-[10px] text-primary hover:underline not-italic cursor-pointer"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </SidebarMenuSubItem>
                                )}
                              </>
                            ) : (
                              <SidebarMenuSubItem>
                                <div className="px-2 py-1 text-xs text-muted-foreground italic">
                                  No groups
                                </div>
                              </SidebarMenuSubItem>
                            )}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    );
                  })
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
                <Button
                  variant="outline"
                  onClick={() => setCreateDocOpen(false)}
                >
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
                        const encodedView = encodeURIComponent(currentView);
                        navigate(
                          `/org/${orgId}/board/${board.id}/view/${encodedView}`,
                        );
                        expandBoard(board.id);
                        setBoardSearchOpen(false);
                        setBoardSearchQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent rounded-lg transition-colors text-left"
                    >
                      <div
                        className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor:
                            board.icon_color || "hsl(221, 83%, 53%)",
                        }}
                      >
                        {board.name.charAt(0).toUpperCase()}
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
        <DeleteBoardDialog
          open={!!deletingBoardId}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingBoardId(null);
              setDeletingBoardName("");
            }
          }}
          boardId={deletingBoardId}
          boardName={deletingBoardName}
        />
      </Sidebar>
    </>
  );
};
