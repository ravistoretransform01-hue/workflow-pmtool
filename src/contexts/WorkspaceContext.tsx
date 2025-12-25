// import {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   type ReactNode,
// } from "react";
// import { LayoutDashboard } from "lucide-react";
// // import { supabase } from '@/integrations/supabase/client';
// import { useTestUser } from "./TestUserContext";

// export interface Board {
//   id: string;
//   name: string;
//   url: string;
//   icon: any;
// }

// export interface Folder {
//   id: string;
//   name: string;
//   boards: Board[];
// }

// export interface Workspace {
//   id: string;
//   name: string;
//   iconColor: string;
//   privacy: "open" | "closed";
//   boards: Board[]; // Boards at workspace level (not in folders)
//   folders: Folder[];
// }

// export type DuplicateOption =
//   | "structure"
//   | "structure-items"
//   | "structure-items-updates";

// interface WorkspaceContextType {
//   workspaces: Workspace[];
//   addWorkspace: (
//     workspace: Omit<Workspace, "id" | "folders" | "boards">,
//     members?: { test_user_id: string; role: string }[],
//     rolePermissions?: Record<string, Record<string, boolean>>
//   ) => Promise<string | null>;
//   addBoard: (
//     workspaceId: string,
//     board: Omit<Board, "id" | "url">,
//     folderId?: string,
//     members?: Array<{ test_user_id: string; role: string }>
//   ) => Promise<void>;
//   addFolder: (workspaceId: string, folderName: string) => Promise<string>;
//   updateFolderName: (
//     workspaceId: string,
//     folderId: string,
//     newName: string
//   ) => Promise<void>;
//   updateBoardName: (
//     workspaceId: string,
//     boardId: string,
//     newName: string
//   ) => Promise<void>;
//   updateWorkspaceName: (workspaceId: string, newName: string) => Promise<void>;
//   deleteWorkspace: (workspaceId: string) => Promise<void>;
//   deleteBoard: (workspaceId: string, boardId: string) => Promise<void>;
//   deleteFolder: (workspaceId: string, folderId: string) => Promise<void>;
//   moveBoard: (
//     workspaceId: string,
//     boardId: string,
//     sourceFolderId: string | null,
//     targetFolderId: string | null
//   ) => Promise<void>;
//   moveBoardToWorkspace: (
//     sourceWorkspaceId: string,
//     targetWorkspaceId: string,
//     boardId: string,
//     sourceFolderId: string | null
//   ) => Promise<void>;
//   getWorkspaceById: (id: string) => Workspace | undefined;
//   reorderFolders: (workspaceId: string, newOrder: Folder[]) => void;
//   reorderBoards: (
//     workspaceId: string,
//     folderId: string,
//     newOrder: Board[]
//   ) => void;
//   duplicateBoard: (
//     workspaceId: string,
//     boardId: string,
//     folderId: string | null,
//     option: DuplicateOption
//   ) => Promise<void>;
// }

// const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
//   undefined
// );

// const initialWorkspaces: Workspace[] = [
//   {
//     id: "client-one",
//     name: "Client One",
//     iconColor: "#3B82F6",
//     privacy: "open",
//     boards: [], // Workspace-level boards
//     folders: [
//       {
//         id: "client-boards",
//         name: "Client Boards",
//         boards: [
//           {
//             id: "client-planning",
//             name: "Client Planning",
//             url: "/workspace/client-one/board/client-planning",
//             icon: LayoutDashboard,
//           },
//           {
//             id: "client-workload",
//             name: "Client Workload",
//             url: "/workspace/client-one/board/client-workload",
//             icon: LayoutDashboard,
//           },
//         ],
//       },
//     ],
//   },
//   {
//     id: "client-two",
//     name: "Client Two",
//     iconColor: "#10B981",
//     privacy: "open",
//     boards: [],
//     folders: [],
//   },
// ];

// export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
//   const { currentUser } = useTestUser();
//   const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Load workspaces from Supabase for current test user
//   useEffect(() => {
//     loadWorkspaces();
//   }, [currentUser.id]);

//   const loadWorkspaces = async () => {
//     setLoading(true);
//     try {
//       // Load workspaces created by the user
//       const { data: ownedWorkspaces, error: wsError } = await supabase
//         .from("workspaces")
//         .select("*")
//         .eq("test_user_id", currentUser.id);

//       if (wsError) throw wsError;

//       // Load workspaces where user is a member
//       const { data: memberWorkspaces, error: memberError } = await supabase
//         .from("workspace_members")
//         .select("workspace_id")
//         .eq("test_user_id", currentUser.id);

//       if (memberError) throw memberError;

//       // Get unique workspace IDs from member workspaces
//       const memberWorkspaceIds =
//         memberWorkspaces?.map((m) => m.workspace_id) || [];

//       // Load full workspace data for member workspaces
//       let additionalWorkspaces = [];
//       if (memberWorkspaceIds.length > 0) {
//         const { data: memberWsData, error: memberWsError } = await supabase
//           .from("workspaces")
//           .select("*")
//           .in("id", memberWorkspaceIds);

//         if (memberWsError) throw memberWsError;
//         additionalWorkspaces = memberWsData || [];
//       }

//       // Combine owned and member workspaces, removing duplicates
//       const allWorkspaceIds = new Set([
//         ...(ownedWorkspaces?.map((ws) => ws.id) || []),
//         ...additionalWorkspaces.map((ws) => ws.id),
//       ]);

//       const workspacesData = [
//         ...(ownedWorkspaces || []),
//         ...additionalWorkspaces.filter(
//           (ws) => !ownedWorkspaces?.find((ows) => ows.id === ws.id)
//         ),
//       ];

//       if (!workspacesData || workspacesData.length === 0) {
//         setWorkspaces([]);
//         setLoading(false);
//         return;
//       }

//       const { data: foldersData, error: foldersError } = await supabase
//         .from("folders")
//         .select("*")
//         .in(
//           "workspace_id",
//           workspacesData.map((ws) => ws.id)
//         );

//       if (foldersError) throw foldersError;

//       const { data: boardsData, error: boardsError } = await supabase
//         .from("boards")
//         .select("*")
//         .in(
//           "workspace_id",
//           workspacesData.map((ws) => ws.id)
//         );

//       if (boardsError) throw boardsError;

//       const workspacesWithData: Workspace[] = workspacesData.map((ws) => {
//         const wsFolders = (foldersData || []).filter(
//           (f) => f.workspace_id === ws.id
//         );
//         const wsBoards = (boardsData || []).filter(
//           (b) => b.workspace_id === ws.id && !b.folder_id
//         );

//         return {
//           id: ws.id,
//           name: ws.name,
//           iconColor: ws.icon_color,
//           privacy: ws.privacy as "open" | "closed",
//           boards: wsBoards.map((b) => ({
//             id: b.id,
//             name: b.name,
//             url: `/workspace/${ws.id}/board/${b.id}`,
//             icon: LayoutDashboard,
//           })),
//           folders: wsFolders.map((f) => {
//             const folderBoards = (boardsData || []).filter(
//               (b) => b.folder_id === f.id
//             );
//             return {
//               id: f.id,
//               name: f.name,
//               boards: folderBoards.map((b) => ({
//                 id: b.id,
//                 name: b.name,
//                 url: `/workspace/${ws.id}/board/${b.id}`,
//                 icon: LayoutDashboard,
//               })),
//             };
//           }),
//         };
//       });

//       setWorkspaces(workspacesWithData);
//     } catch (error) {
//       console.error("Error loading workspaces:", error);
//       setWorkspaces([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addWorkspace = async (
//     workspace: Omit<Workspace, "id" | "folders" | "boards">,
//     members?: { test_user_id: string; role: string }[],
//     rolePermissions?: Record<string, Record<string, boolean>>
//   ): Promise<string | null> => {
//     try {
//       const { data, error } = await supabase
//         .from("workspaces")
//         .insert({
//           name: workspace.name,
//           icon_color: workspace.iconColor,
//           privacy: workspace.privacy,
//           test_user_id: currentUser.id,
//         })
//         .select()
//         .single();

//       if (error) throw error;

//       // Automatically add the creator as a member
//       const { error: memberError } = await supabase
//         .from("workspace_members")
//         .insert({
//           workspace_id: data.id,
//           test_user_id: currentUser.id,
//           role: "admin",
//         });

//       if (memberError) {
//         console.error("Error adding workspace member:", memberError);
//       }

//       // Add additional members if provided (excluding creator who was already added)
//       if (members && members.length > 0) {
//         const additionalMembers = members.filter(
//           (member) => member.test_user_id !== currentUser.id
//         );

//         if (additionalMembers.length > 0) {
//           const memberInserts = additionalMembers.map((member) => ({
//             workspace_id: data.id,
//             test_user_id: member.test_user_id,
//             role: member.role,
//           }));

//           const { error: additionalMembersError } = await supabase
//             .from("workspace_members")
//             .insert(memberInserts);

//           if (additionalMembersError) {
//             console.error(
//               "Error adding additional workspace members:",
//               additionalMembersError
//             );
//           }
//         }
//       }

//       // Save only custom role permissions (not default roles which are handled globally)
//       if (rolePermissions) {
//         const defaultRoles = [
//           "owner",
//           "projectmanager",
//           "admin",
//           "client",
//           "developer",
//           "viewer",
//         ];
//         const customRoleEntries = Object.entries(rolePermissions).filter(
//           ([roleName]) => !defaultRoles.includes(roleName)
//         );

//         if (customRoleEntries.length > 0) {
//           const permissionInserts = customRoleEntries.map(
//             ([roleName, permissions]) => ({
//               workspace_id: data.id,
//               role_name: roleName,
//               permissions: permissions,
//             })
//           );

//           const { error: permissionsError } = await supabase
//             .from("workspace_custom_roles")
//             .insert(permissionInserts);

//           if (permissionsError) {
//             console.error("Error saving role permissions:", permissionsError);
//           }
//         }
//       }

//       const newWorkspace: Workspace = {
//         id: data.id,
//         name: data.name,
//         iconColor: data.icon_color,
//         privacy: data.privacy as "open" | "closed",
//         boards: [],
//         folders: [],
//       };
//       setWorkspaces((prev) => [...prev, newWorkspace]);
//       return data.id;
//     } catch (error) {
//       console.error("Error adding workspace:", error);
//       return null;
//     }
//   };

//   const addBoard = async (
//     workspaceId: string,
//     board: Omit<Board, "id" | "url">,
//     folderId?: string,
//     members?: Array<{ test_user_id: string; role: string }>
//   ) => {
//     // try {
//     //   const { data, error } = await supabase
//     //     .from("boards")
//     //     .insert({
//     //       name: board.name,
//     //       workspace_id: workspaceId,
//     //       folder_id: folderId || null,
//     //       creator_test_user_id: currentUser.id,
//     //     })
//     //     .select()
//     //     .single();

//     //   if (error) throw error;

//     //   // If members array is provided, use it (includes creator with proper role)
//     //   // Otherwise, add creator as Board Admin by default
//     //   if (members && members.length > 0) {
//     //     const memberInserts = members.map((member) => ({
//     //       board_id: data.id,
//     //       test_user_id: member.test_user_id,
//     //       role: member.role,
//     //     }));

//     //     const { error: membersError } = await supabase
//     //       .from("board_members")
//     //       .insert(memberInserts);

//     //     if (membersError) {
//     //       console.error("Error adding board members:", membersError);
//     //     }

//     //     // Send notifications to members (excluding the creator)
//     //     const nonCreatorMembers = members.filter(
//     //       (m) => m.test_user_id !== currentUser.id
//     //     );
//     //     for (const member of nonCreatorMembers) {
//     //       await supabase.from("notifications").insert({
//     //         recipient_test_user_id: member.test_user_id,
//     //         sender_test_user_id: currentUser.id,
//     //         type: "board_invite",
//     //         title: "Added to board",
//     //         message: `added you to the board "${board.name}"`,
//     //         link: `/workspace/${workspaceId}/board/${data.id}`,
//     //       });
//     //     }
//     //   } else {
//     //     // Fallback: add creator as Board Admin
//     //     const { error: memberError } = await supabase
//     //       .from("board_members")
//     //       .insert({
//     //         board_id: data.id,
//     //         test_user_id: currentUser.id,
//     //         role: "owner",
//     //       });

//     //     if (memberError) {
//     //       console.error("Error adding board member:", memberError);
//     //     }
//     //   }

//     //   const newBoard: Board = {
//     //     id: data.id,
//     //     name: data.name,
//     //     url: `/workspace/${workspaceId}/board/${data.id}`,
//     //     icon: board.icon,
//     //   };

//     //   setWorkspaces((prev) =>
//     //     prev.map((ws) => {
//     //       if (ws.id !== workspaceId) return ws;

//     //       if (folderId) {
//     //         return {
//     //           ...ws,
//     //           folders: ws.folders.map((folder) =>
//     //             folder.id === folderId
//     //               ? { ...folder, boards: [...folder.boards, newBoard] }
//     //               : folder
//     //           ),
//     //         };
//     //       }

//     //       return {
//     //         ...ws,
//     //         boards: [...ws.boards, newBoard],
//     //       };
//     //     })
//     //   );
//     // } catch (error) {
//     //   console.error("Error adding board:", error);
//     // }
//   };

//   const addFolder = async (workspaceId: string, folderName: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("folders")
//         .insert({
//           name: folderName,
//           workspace_id: workspaceId,
//         })
//         .select()
//         .single();

//       if (error) throw error;

//       const newFolder: Folder = {
//         id: data.id,
//         name: data.name,
//         boards: [],
//       };

//       setWorkspaces((prev) =>
//         prev.map((ws) =>
//           ws.id === workspaceId
//             ? { ...ws, folders: [...ws.folders, newFolder] }
//             : ws
//         )
//       );

//       return data.id;
//     } catch (error) {
//       console.error("Error adding folder:", error);
//       return "";
//     }
//   };

//   const updateFolderName = async (
//     workspaceId: string,
//     folderId: string,
//     newName: string
//   ) => {
//     try {
//       const { error } = await supabase
//         .from("folders")
//         .update({ name: newName })
//         .eq("id", folderId);

//       if (error) throw error;

//       setWorkspaces((prev) =>
//         prev.map((ws) =>
//           ws.id === workspaceId
//             ? {
//                 ...ws,
//                 folders: ws.folders.map((folder) =>
//                   folder.id === folderId ? { ...folder, name: newName } : folder
//                 ),
//               }
//             : ws
//         )
//       );
//     } catch (error) {
//       console.error("Error updating folder name:", error);
//     }
//   };

//   const updateBoardName = async (
//     workspaceId: string,
//     boardId: string,
//     newName: string
//   ) => {
//     try {
//       const { error } = await supabase
//         .from("boards")
//         .update({ name: newName })
//         .eq("id", boardId);

//       if (error) throw error;

//       setWorkspaces((prev) =>
//         prev.map((ws) => {
//           if (ws.id !== workspaceId) return ws;

//           return {
//             ...ws,
//             boards: ws.boards.map((board) =>
//               board.id === boardId ? { ...board, name: newName } : board
//             ),
//             folders: ws.folders.map((folder) => ({
//               ...folder,
//               boards: folder.boards.map((board) =>
//                 board.id === boardId ? { ...board, name: newName } : board
//               ),
//             })),
//           };
//         })
//       );
//     } catch (error) {
//       console.error("Error updating board name:", error);
//     }
//   };

//   const updateWorkspaceName = async (workspaceId: string, newName: string) => {
//     try {
//       const { error } = await supabase
//         .from("workspaces")
//         .update({ name: newName })
//         .eq("id", workspaceId);

//       if (error) throw error;

//       setWorkspaces((prev) =>
//         prev.map((ws) =>
//           ws.id === workspaceId ? { ...ws, name: newName } : ws
//         )
//       );
//     } catch (error) {
//       console.error("Error updating workspace name:", error);
//     }
//   };

//   const deleteWorkspace = async (workspaceId: string) => {
//     try {
//       const workspace = workspaces.find((ws) => ws.id === workspaceId);
//       if (!workspace) return;

//       // Delete from database
//       const { error } = await supabase
//         .from("workspaces")
//         .delete()
//         .eq("id", workspaceId);

//       if (error) throw error;

//       // Add to trash
//       const deletedItem = {
//         id: workspaceId,
//         name: workspace.name,
//         type: "Workspace",
//         deletedFrom: [workspace.name],
//         deletedBy: {
//           name: currentUser.name,
//           initials: currentUser.name
//             .split(" ")
//             .map((n) => n[0])
//             .join(""),
//         },
//         deletedDate: "Just now",
//         originalData: workspace,
//       };

//       const existingDeleted = localStorage.getItem("deleted-items");
//       const deletedItems = existingDeleted ? JSON.parse(existingDeleted) : [];
//       localStorage.setItem(
//         "deleted-items",
//         JSON.stringify([deletedItem, ...deletedItems])
//       );

//       // Remove from local state
//       setWorkspaces((prev) => prev.filter((ws) => ws.id !== workspaceId));
//     } catch (error) {
//       console.error("Error deleting workspace:", error);
//     }
//   };

//   const moveBoard = async (
//     workspaceId: string,
//     boardId: string,
//     sourceFolderId: string | null,
//     targetFolderId: string | null
//   ) => {
//     try {
//       const { error } = await supabase
//         .from("boards")
//         .update({ folder_id: targetFolderId })
//         .eq("id", boardId);

//       if (error) throw error;

//       setWorkspaces((prev) =>
//         prev.map((ws) => {
//           if (ws.id !== workspaceId) return ws;

//           let board: Board | undefined;

//           if (sourceFolderId === null) {
//             board = ws.boards.find((b) => b.id === boardId);
//           } else {
//             const sourceFolder = ws.folders.find(
//               (f) => f.id === sourceFolderId
//             );
//             board = sourceFolder?.boards.find((b) => b.id === boardId);
//           }

//           if (!board) return ws;

//           let updatedWorkspace = { ...ws };

//           if (sourceFolderId === null) {
//             updatedWorkspace.boards = ws.boards.filter((b) => b.id !== boardId);
//           } else {
//             updatedWorkspace.folders = ws.folders.map((folder) =>
//               folder.id === sourceFolderId
//                 ? {
//                     ...folder,
//                     boards: folder.boards.filter((b) => b.id !== boardId),
//                   }
//                 : folder
//             );
//           }

//           if (targetFolderId === null) {
//             updatedWorkspace.boards = [...updatedWorkspace.boards, board];
//           } else {
//             updatedWorkspace.folders = updatedWorkspace.folders.map((folder) =>
//               folder.id === targetFolderId
//                 ? { ...folder, boards: [...folder.boards, board] }
//                 : folder
//             );
//           }

//           return updatedWorkspace;
//         })
//       );
//     } catch (error) {
//       console.error("Error moving board:", error);
//     }
//   };

//   const getWorkspaceById = (id: string) => {
//     return workspaces.find((ws) => ws.id === id);
//   };

//   const reorderFolders = (workspaceId: string, newOrder: Folder[]) => {
//     setWorkspaces((prev) =>
//       prev.map((ws) =>
//         ws.id === workspaceId ? { ...ws, folders: newOrder } : ws
//       )
//     );
//   };

//   const reorderBoards = (
//     workspaceId: string,
//     folderId: string,
//     newOrder: Board[]
//   ) => {
//     setWorkspaces((prev) =>
//       prev.map((ws) =>
//         ws.id === workspaceId
//           ? {
//               ...ws,
//               folders: ws.folders.map((folder) =>
//                 folder.id === folderId
//                   ? { ...folder, boards: newOrder }
//                   : folder
//               ),
//             }
//           : ws
//       )
//     );
//   };

//   const deleteBoard = async (workspaceId: string, boardId: string) => {
//     // Delete from database
//     const { error } = await supabase.from("boards").delete().eq("id", boardId);
//     if (error) throw error;

//     // Update local state
//     setWorkspaces((prev) =>
//       prev.map((ws) =>
//         ws.id === workspaceId
//           ? {
//               ...ws,
//               boards: ws.boards.filter((b) => b.id !== boardId),
//               folders: ws.folders.map((folder) => ({
//                 ...folder,
//                 boards: folder.boards.filter((b) => b.id !== boardId),
//               })),
//             }
//           : ws
//       )
//     );
//   };

//   const deleteFolder = async (workspaceId: string, folderId: string) => {
//     try {
//       // First, move all boards in the folder to workspace root
//       const workspace = workspaces.find((ws) => ws.id === workspaceId);
//       const folder = workspace?.folders.find((f) => f.id === folderId);

//       if (folder && folder.boards.length > 0) {
//         // Update all boards to have null folder_id
//         const { error: boardsError } = await supabase
//           .from("boards")
//           .update({ folder_id: null })
//           .eq("folder_id", folderId);

//         if (boardsError) throw boardsError;
//       }

//       // Delete the folder from database
//       const { error } = await supabase
//         .from("folders")
//         .delete()
//         .eq("id", folderId);

//       if (error) throw error;

//       // Update local state - move boards to workspace level and remove folder
//       setWorkspaces((prev) =>
//         prev.map((ws) => {
//           if (ws.id !== workspaceId) return ws;

//           const folderToDelete = ws.folders.find((f) => f.id === folderId);
//           const boardsToMove = folderToDelete?.boards || [];

//           return {
//             ...ws,
//             boards: [...ws.boards, ...boardsToMove],
//             folders: ws.folders.filter((f) => f.id !== folderId),
//           };
//         })
//       );
//     } catch (error) {
//       console.error("Error deleting folder:", error);
//     }
//   };

//   const moveBoardToWorkspace = async (
//     sourceWorkspaceId: string,
//     targetWorkspaceId: string,
//     boardId: string,
//     sourceFolderId: string | null
//   ) => {
//     try {
//       // Update in database
//       const { error } = await supabase
//         .from("boards")
//         .update({ workspace_id: targetWorkspaceId, folder_id: null })
//         .eq("id", boardId);

//       if (error) throw error;

//       // Update local state
//       setWorkspaces((prev) => {
//         // Find the board in source workspace
//         const sourceWs = prev.find((ws) => ws.id === sourceWorkspaceId);
//         let board: Board | undefined;

//         if (sourceFolderId === null) {
//           board = sourceWs?.boards.find((b) => b.id === boardId);
//         } else {
//           const sourceFolder = sourceWs?.folders.find(
//             (f) => f.id === sourceFolderId
//           );
//           board = sourceFolder?.boards.find((b) => b.id === boardId);
//         }

//         if (!board) return prev;

//         // Update the board's URL to reflect new workspace
//         const updatedBoard = {
//           ...board,
//           url: `/workspace/${targetWorkspaceId}/board/${boardId}`,
//         };

//         return prev.map((ws) => {
//           // Remove from source workspace
//           if (ws.id === sourceWorkspaceId) {
//             return {
//               ...ws,
//               boards:
//                 sourceFolderId === null
//                   ? ws.boards.filter((b) => b.id !== boardId)
//                   : ws.boards,
//               folders:
//                 sourceFolderId !== null
//                   ? ws.folders.map((folder) =>
//                       folder.id === sourceFolderId
//                         ? {
//                             ...folder,
//                             boards: folder.boards.filter(
//                               (b) => b.id !== boardId
//                             ),
//                           }
//                         : folder
//                     )
//                   : ws.folders,
//             };
//           }
//           // Add to target workspace
//           if (ws.id === targetWorkspaceId) {
//             return {
//               ...ws,
//               boards: [...ws.boards, updatedBoard],
//             };
//           }
//           return ws;
//         });
//       });
//     } catch (error) {
//       console.error("Error moving board to workspace:", error);
//     }
//   };

//   const duplicateBoard = async (
//     workspaceId: string,
//     boardId: string,
//     folderId: string | null,
//     option: DuplicateOption
//   ) => {
//     try {
//       // Get source board
//       const workspace = workspaces.find((ws) => ws.id === workspaceId);
//       let sourceBoard: Board | undefined;

//       if (folderId) {
//         const folder = workspace?.folders.find((f) => f.id === folderId);
//         sourceBoard = folder?.boards.find((b) => b.id === boardId);
//       } else {
//         sourceBoard = workspace?.boards.find((b) => b.id === boardId);
//       }

//       if (!sourceBoard) throw new Error("Board not found");

//       // Create new board
//       const { data: newBoardData, error: boardError } = await supabase
//         .from("boards")
//         .insert({
//           name: `${sourceBoard.name} (copy)`,
//           workspace_id: workspaceId,
//           folder_id: folderId,
//           creator_test_user_id: currentUser.id,
//         })
//         .select()
//         .single();

//       if (boardError) throw boardError;

//       // Add creator as board member
//       await supabase.from("board_members").insert({
//         board_id: newBoardData.id,
//         test_user_id: currentUser.id,
//         role: "Board Admin",
//       });

//       // Copy custom columns
//       const { data: sourceColumns } = await supabase
//         .from("board_custom_columns")
//         .select("*")
//         .eq("board_id", boardId);

//       if (sourceColumns && sourceColumns.length > 0) {
//         const newColumns = sourceColumns.map((col) => ({
//           board_id: newBoardData.id,
//           column_name: col.column_name,
//           column_type: col.column_type,
//           display_name: col.display_name,
//           options: col.options,
//         }));
//         await supabase.from("board_custom_columns").insert(newColumns);
//       }

//       // Copy groups
//       const { data: sourceGroups } = await supabase
//         .from("groups")
//         .select("*")
//         .eq("board_id", boardId)
//         .order("position");

//       const groupIdMap: Record<string, string> = {};

//       if (sourceGroups && sourceGroups.length > 0) {
//         for (const group of sourceGroups) {
//           const { data: newGroup } = await supabase
//             .from("groups")
//             .insert({
//               board_id: newBoardData.id,
//               name: group.name,
//               color: group.color,
//               position: group.position,
//             })
//             .select()
//             .single();

//           if (newGroup) {
//             groupIdMap[group.id] = newGroup.id;
//           }
//         }
//       }

//       // Copy items if requested
//       if (
//         (option === "structure-items" ||
//           option === "structure-items-updates") &&
//         Object.keys(groupIdMap).length > 0
//       ) {
//         const { data: sourceItems } = await supabase
//           .from("items")
//           .select("*")
//           .in("group_id", Object.keys(groupIdMap));

//         const itemIdMap: Record<string, string> = {};

//         if (sourceItems && sourceItems.length > 0) {
//           for (const item of sourceItems) {
//             const { data: newItem } = await supabase
//               .from("items")
//               .insert({
//                 group_id: groupIdMap[item.group_id],
//                 name: item.name,
//                 status: item.status,
//                 priority: item.priority,
//                 person: item.person,
//                 estimated_date: item.estimated_date,
//                 estimated_date_end: item.estimated_date_end,
//                 estimated_time: item.estimated_time,
//                 hours_start: item.hours_start,
//                 hours_end: item.hours_end,
//                 time_spent: item.time_spent,
//                 custom_column_values: item.custom_column_values,
//                 position: item.position,
//                 repeat_mode: item.repeat_mode,
//                 repeat_interval: item.repeat_interval,
//                 repeat_unit: item.repeat_unit,
//                 repeat_days: item.repeat_days,
//                 repeat_ends_type: item.repeat_ends_type,
//                 repeat_ends_on: item.repeat_ends_on,
//                 repeat_ends_after: item.repeat_ends_after,
//                 repeat_monthly_type: item.repeat_monthly_type,
//               })
//               .select()
//               .single();

//             if (newItem) {
//               itemIdMap[item.id] = newItem.id;
//             }
//           }
//         }

//         // Copy updates if requested
//         if (
//           option === "structure-items-updates" &&
//           Object.keys(itemIdMap).length > 0
//         ) {
//           const { data: sourceUpdates } = await supabase
//             .from("updates")
//             .select("*")
//             .in("item_id", Object.keys(itemIdMap));

//           if (sourceUpdates && sourceUpdates.length > 0) {
//             const newUpdates = sourceUpdates.map((update) => ({
//               item_id: itemIdMap[update.item_id],
//               text: update.text,
//               test_user_id: update.test_user_id,
//               update_type: update.update_type,
//               is_sop: update.is_sop,
//               is_task_summary: update.is_task_summary,
//               pinned: update.pinned,
//               files: update.files,
//             }));
//             await supabase.from("updates").insert(newUpdates);
//           }
//         }
//       }

//       // Update local state
//       const newBoard: Board = {
//         id: newBoardData.id,
//         name: newBoardData.name,
//         url: `/workspace/${workspaceId}/board/${newBoardData.id}`,
//         icon: sourceBoard.icon,
//       };

//       setWorkspaces((prev) =>
//         prev.map((ws) => {
//           if (ws.id !== workspaceId) return ws;

//           if (folderId) {
//             return {
//               ...ws,
//               folders: ws.folders.map((folder) =>
//                 folder.id === folderId
//                   ? { ...folder, boards: [...folder.boards, newBoard] }
//                   : folder
//               ),
//             };
//           }

//           return {
//             ...ws,
//             boards: [...ws.boards, newBoard],
//           };
//         })
//       );
//     } catch (error) {
//       console.error("Error duplicating board:", error);
//       throw error;
//     }
//   };

//   return (
//     <WorkspaceContext.Provider
//       value={{
//         workspaces,
//         addWorkspace,
//         addBoard,
//         addFolder,
//         updateFolderName,
//         updateBoardName,
//         updateWorkspaceName,
//         deleteWorkspace,
//         deleteBoard,
//         deleteFolder,
//         moveBoard,
//         moveBoardToWorkspace,
//         getWorkspaceById,
//         reorderFolders,
//         reorderBoards,
//         duplicateBoard,
//       }}
//     >
//       {children}
//     </WorkspaceContext.Provider>
//   );
// };

// export const useWorkspace = (): WorkspaceContextType => {
//   const context = useContext(WorkspaceContext);
//   if (context === undefined) {
//     throw new Error("useWorkspace must be used within WorkspaceProvider");
//   }
//   return context;
// };
