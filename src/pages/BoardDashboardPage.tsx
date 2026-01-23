import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MoreHorizontal, UserPlus, LayoutDashboard } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { boardsApi } from "@/features/boards/boardsApi";
import { BoardInviteDialog } from "@/shared/components/BoardInviteDialog";
import { getMembers } from "@/features/cms/cmsStorage";

const colorOptions = [
  { name: "Blue", value: "hsl(221, 83%, 53%)" },
  { name: "Purple", value: "hsl(262, 83%, 58%)" },
  { name: "Pink", value: "hsl(330, 81%, 60%)" },
  { name: "Red", value: "hsl(0, 72%, 51%)" },
  { name: "Orange", value: "hsl(25, 95%, 53%)" },
  { name: "Yellow", value: "hsl(48, 96%, 53%)" },
  { name: "Green", value: "hsl(142, 71%, 45%)" },
  { name: "Teal", value: "hsl(173, 80%, 40%)" },
  { name: "Cyan", value: "hsl(199, 89%, 48%)" },
  { name: "Indigo", value: "hsl(239, 84%, 67%)" },
];

export default function BoardDashboardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [boardName, setBoardName] = useState("Loading...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [iconColor, setIconColor] = useState("hsl(221, 83%, 53%)");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("user-management");

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Mock Members Data (Replace with real API)
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; role: string; avatarColor?: string }>>([]);

  useEffect(() => {
    if (boardId) {
      loadBoardData(Number(boardId));
      loadMembers(Number(boardId));
    }
  }, [boardId]);

  const loadBoardData = async (id: number) => {
    try {
      const board = await boardsApi.getBoardById(String(id));
      if (board) {
        setBoardName(board.name);
        setCurrentName(board.name);
        setCurrentDescription(board.description || "");
        if (board.icon_color) setIconColor(board.icon_color);

        // Add creator to members if available
        const creator = board.creator;
        if (creator) {
          setMembers(prev => {
            const exists = prev.some(m => m.id === String(creator.id));
            if (exists) return prev;
            return [
              ...prev,
              {
                id: String(creator.id),
                name: creator.name,
                email: creator.email,
                role: "Project Owner",
                avatarColor: board.icon_color || "hsl(221, 83%, 53%)"
              }
            ];
          });
        }
      }
    } catch (error) {
      console.error("Failed to load board data:", error);
      toast({ title: "Error", description: "Failed to load board data", variant: "destructive" });
    }
  };

  const loadMembers = async (id: number) => {
    try {
      // Get organization_id and user_id from localStorage
      const organizationId = localStorage.getItem('organization_id') || '2';
      const userId = localStorage.getItem('user_id') || '1';

      // Fetch members from CMS API
      const cmsMembers = await getMembers({
        organization_id: parseInt(organizationId),
        board_id: id,
        user_id: parseInt(userId)
      });

      // Transform CMS members to dashboard member format
      const transformedMembers = cmsMembers.map(member => ({
        id: member.user_id,
        name: member.name,
        email: member.email || `${member.username || 'user'}@example.com`,
        role: "Project Member", // Default role, can be enhanced later
        avatarColor: `hsl(${parseInt(member.user_id) * 137 % 360}, 70%, 50%)` // Generate color from user_id
      }));

      setMembers(transformedMembers);
    } catch (e) {
      console.error('Failed to load members:', e);
      // Don't show error toast, just log it
    }
  }

  // Effect handles
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (!currentName.trim()) {
      setCurrentName(boardName);
      return;
    }

    if (currentName !== boardName && boardId) {
      try {
        await boardsApi.updateBoard(boardId, { name: currentName });
        setBoardName(currentName);
        toast({ title: "Success", description: "Board name updated" });
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to update board name", variant: "destructive" });
        setCurrentName(boardName);
      }
    }
  };

  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    // API call to update desc would go here
  };

  return (
    <div className="h-full flex flex-col bg-background min-h-screen">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
          onClick={() => navigate(`/board/${boardId}`)}
        >
          ← Back to Project
        </Button>

        <div className="flex items-center gap-6">
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-32 h-32 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-sm"
                style={{ backgroundColor: iconColor }}
              >
                <span className="text-6xl font-bold text-white">
                  {currentName.charAt(0)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 bg-popover z-50 shadow-lg border" align="start">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Choose icon color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      onClick={async () => {
                        setIconColor(color.value);
                        setColorPickerOpen(false);
                        if (boardId) {
                          try {
                            await boardsApi.updateBoard(boardId, { icon_color: color.value });
                          } catch (e) { console.error(e); }
                        }
                      }}
                      className="w-10 h-10 rounded-lg transition-transform hover:scale-110 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="text-4xl font-semibold h-auto py-1 px-2 mb-2 border-2 border-primary flex-1"
                />
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h1
                    className="text-4xl font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsEditingName(true)}
                  >
                    {currentName}
                  </h1>

                  {/* Small profile icon next to board name for members */}
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map(m => (
                      <Avatar key={m.id} className="w-6 h-6 border-2 border-background">
                        <AvatarFallback style={{ backgroundColor: m.avatarColor }} className="text-[10px] text-white">
                          {m.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-muted transition-colors mb-2">
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => navigate(`/board/${boardId}`)}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Go to Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                    Rename project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isEditingDescription ? (
              <Textarea
                ref={descriptionInputRef}
                value={currentDescription}
                onChange={(e) => setCurrentDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add board description"
                className="min-h-[60px] border-2 border-primary max-w-xl"
              />
            ) : (
              <p
                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditingDescription(true)}
              >
                {currentDescription || "Add board description"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="user-management">User management</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="user-management" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing: {members.length} result{members.length !== 1 ? 's' : ''}
              </p>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-5 w-5" />
                Invite
              </Button>
            </div>

            {/* Members Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-6 py-4 bg-muted/30 border-b border-border">
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-sm font-medium text-muted-foreground">User role</div>
              </div>

              <div className="divide-y divide-border">
                {members.length > 0 ? members.map((member) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ backgroundColor: member.avatarColor }}>
                          <span className="text-white text-xs font-semibold">
                            {member.name.charAt(0)}
                          </span>
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{member.name}</span>
                    </div>

                    <div className="text-muted-foreground text-sm">
                      {member.email}
                    </div>

                    <Select defaultValue={member.role}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Project Owner">Project Owner</SelectItem>
                        <SelectItem value="Project Manager">Project Manager</SelectItem>
                        <SelectItem value="Project Admin">Project Admin</SelectItem>
                        <SelectItem value="Project Developer">Project Developer</SelectItem>
                        <SelectItem value="Project Viewer">Project Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )) : (
                  <div className="px-6 py-8 text-center text-muted-foreground">
                    No members found.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm">
                See and edit all project permissions
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions">
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
              Permissions management coming soon.
            </div>
          </TabsContent>

          <TabsContent value="my-schedule">
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
              Schedule view coming soon.
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BoardInviteDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            // Reload members when dialog closes to ensure main list is fresh
            if (boardId) loadMembers(Number(boardId));
          }
        }}
        boardId={boardId || ""}
        onMembersUpdate={() => {
          if (boardId) loadMembers(Number(boardId));
        }}
      />
    </div>
  );
}

// import { useParams, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { Button } from "@/shared/components/ui/button";
// import { ArrowLeft } from "lucide-react";

// interface BoardDashboard {
//   id: string;
//   boardId: string;
//   taskCount: number;
//   completedCount: number;
//   teamMembers: number;
// }

// export default function BoardDashboardPage() {
//   const { boardId } = useParams();
//   const navigate = useNavigate();
//   const [dashboard] = useState<BoardDashboard | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // TODO: Fetch dashboard data from REST API
//     setLoading(false);
//   }, [boardId]);

//   return (
//     <div className="min-h-screen p-8">
//       <div className="max-w-7xl mx-auto">
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={() => navigate(`/board/${boardId}`)}
//           className="mb-4"
//         >
//           <ArrowLeft className="h-4 w-4 mr-2" />
//           Back
//         </Button>

//         {loading ? (
//           <div className="text-center py-8">Loading...</div>
//         ) : dashboard ? (
//           <div>
//             <h1 className="text-3xl font-bold mb-8">Board Dashboard</h1>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Total Tasks</p>
//                 <p className="text-3xl font-bold">{dashboard.taskCount}</p>
//               </div>
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Completed</p>
//                 <p className="text-3xl font-bold">{dashboard.completedCount}</p>
//               </div>
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Team Members</p>
//                 <p className="text-3xl font-bold">{dashboard.teamMembers}</p>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="text-center py-8 text-muted-foreground">
//             <p>Dashboard not found</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
