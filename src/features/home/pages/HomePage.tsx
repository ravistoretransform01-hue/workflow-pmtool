// import { useState, useEffect } from "react";
// import {
//   Search,
//   Users,
//   Settings,
//   ChevronLeft,
//   ChevronRight,
//   EyeOff,
//   Eye,
//   LayoutGrid,
//   ChevronDown,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { groupsApi } from "@/features/groups/groupsApi";
// import { boardsApi } from "@/features/boards/boardsApi";
// import type { Group } from "@/features/groups/types";
// import type { Board } from "@/features/boards/types";
// import { Input } from "@/shared/components/ui/input";
// import { Button } from "@/shared/components/ui/button";
// import { Badge } from "@/shared/components/ui/badge";
// import { Progress } from "@/shared/components/ui/progress";
// import { Checkbox } from "@/shared/components/ui/checkbox";
// import { Skeleton } from "@/shared/components/ui/skeleton";
// import { useAppSelector } from "@/app/hooks";
// import type { RootState } from "@/app/store";

// const HomePage = () => {
//   const navigate = useNavigate();
//   const [groups, setGroups] = useState<Group[]>([]);
//   const [boards, setBoards] = useState<Board[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");
//   const refreshCounter = useAppSelector(
//     (state: RootState) => state.ui.refreshCounter,
//   );

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [groupsData, boardsData] = await Promise.all([
//           groupsApi.getAllGroups(),
//           boardsApi.getBoards(),
//         ]);
//         setGroups(groupsData || []);
//         setBoards(boardsData || []);
//       } catch (error) {
//         console.error("Error fetching homepage data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [refreshCounter]);

//   const getBoardName = (boardId: number | string) => {
//     const board = boards.find((b) => String(b.id) === String(boardId));
//     return board?.name || "ALL-ITEMS";
//   };

//   const filteredGroups = groups.filter(
//     (group) =>
//       group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       getBoardName(group.board_id)
//         .toLowerCase()
//         .includes(searchQuery.toLowerCase()),
//   );

//   if (loading) {
//     return (
//       <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-slate-200">
//         <div className="flex justify-between items-center">
//           <Skeleton className="h-10 w-48 bg-slate-800" />
//           <Skeleton className="h-10 w-32 bg-slate-800" />
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {[1, 2, 3, 4].map((i) => (
//             <Skeleton key={i} className="h-48 w-full bg-slate-800 rounded-xl" />
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-8 bg-[#0b0f1a] min-h-screen text-slate-200 font-sans">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-8">
//         <div className="flex items-center gap-3">
//           <h1 className="text-2xl font-bold tracking-tight">
//             Ongoing Projects
//           </h1>
//           <div className="p-1.5 hover:bg-slate-800 rounded-md cursor-pointer transition-colors text-slate-400 hover:text-white">
//             <Settings className="h-4 w-4" />
//           </div>
//         </div>
//         <Badge
//           variant="secondary"
//           className="bg-slate-800/80 text-slate-300 hover:bg-slate-700 px-4 py-1.5 text-xs font-semibold rounded-full border border-slate-700/50"
//         >
//           {groups.length} Groups
//         </Badge>
//       </div>

//       {/* Date Filter Bar */}
//       <div className="flex items-center justify-center gap-4 mb-8">
//         <Button
//           variant="outline"
//           size="sm"
//           className="bg-[#1e293b] border-none hover:bg-slate-700 text-slate-300 h-8 text-xs font-semibold px-4"
//         >
//           Today
//         </Button>
//         <div className="flex items-center gap-6 px-4 py-1 bg-[#1e293b]/50 rounded-lg">
//           <ChevronLeft className="h-4 w-4 text-slate-400 cursor-pointer hover:text-white" />
//           <span className="font-bold text-slate-200 min-w-[120px] text-center text-sm">
//             March 2, 2026
//           </span>
//           <ChevronRight className="h-4 w-4 text-slate-400 cursor-pointer hover:text-white" />
//         </div>
//         <Button
//           variant="outline"
//           size="sm"
//           className="bg-[#1e293b] border-none hover:bg-slate-700 text-slate-300 h-8 text-xs font-semibold px-4 flex items-center gap-2"
//         >
//           Day <ChevronDown className="h-3 w-3" />
//         </Button>
//       </div>

//       {/* Search & Filter Options */}
//       <div className="flex flex-wrap items-center gap-6 mb-8 text-xs text-slate-400 font-medium">
//         <div className="relative w-72">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//           <Input
//             placeholder="Search projects..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-10 bg-slate-900/40 border-slate-800/50 focus-visible:ring-1 focus-visible:ring-primary h-9 text-slate-300 placeholder:text-slate-600"
//           />
//         </div>

//         <div className="flex items-center gap-3 cursor-pointer hover:text-slate-200 transition-colors">
//           <Checkbox
//             id="my-items"
//             className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4 rounded-sm"
//           />
//           <label htmlFor="my-items" className="cursor-pointer">
//             My Items
//           </label>
//         </div>

//         <div className="flex items-center gap-3 cursor-pointer hover:text-slate-200 transition-colors">
//           <Checkbox
//             id="my-team"
//             className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4 rounded-sm"
//           />
//           <label htmlFor="my-team" className="cursor-pointer">
//             My Team
//           </label>
//         </div>

//         <div className="flex items-center gap-3 cursor-pointer hover:text-slate-200 transition-colors">
//           <Checkbox
//             id="done-items"
//             className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4 rounded-sm"
//           />
//           <label htmlFor="done-items" className="cursor-pointer">
//             Done Items (4)
//           </label>
//         </div>

//         <div className="flex items-center gap-2 cursor-pointer hover:text-slate-200 ml-auto transition-colors">
//           <EyeOff className="h-4 w-4" />
//           <span>Hide</span>
//         </div>

//         <div className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors">
//           <Eye className="h-4 w-4 text-primary" />
//           <span className="text-slate-300">Only Show</span>
//         </div>
//       </div>

//       {/* Projects Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
//         {filteredGroups.map((group) => (
//           <div
//             key={group.id}
//             onClick={() => navigate(`/board/${group.board_id}`)}
//             className="bg-[#111827]/60 hover:bg-[#1f2937]/50 border border-slate-800/60 rounded-xl p-6 cursor-pointer transition-all duration-300 group relative border-l-4"
//             style={{ borderLeftColor: group.color || "#3b82f6" }}
//           >
//             <div className="flex justify-between items-start mb-1">
//               <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors pr-12 line-clamp-1">
//                 {group.name}
//               </h3>
//               <Badge className="bg-primary/20 text-primary border-none text-[9px] uppercase font-black px-2 py-0.5 rounded-sm tracking-wider">
//                 active
//               </Badge>
//             </div>
//             <p className="text-slate-500 text-[11px] mb-8 uppercase tracking-[0.1em] font-bold opacity-80">
//               {getBoardName(group.board_id)}
//             </p>

//             <div className="space-y-3 mb-8">
//               <div className="flex justify-between text-[11px] font-bold text-slate-400">
//                 <span className="uppercase tracking-wider">Progress</span>
//                 <span className="text-slate-300">0%</span>
//               </div>
//               <Progress value={0} className="h-1.5 bg-slate-800 rounded-full" />
//             </div>

//             <div className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
//               <Users className="h-4 w-4" />
//               <span className="text-[11px] font-bold tracking-tight">
//                 1 members
//               </span>
//             </div>
//           </div>
//         ))}

//         {filteredGroups.length === 0 && (
//           <div className="col-span-full py-32 text-center text-slate-500 bg-[#111827]/40 rounded-2xl border border-dashed border-slate-800">
//             <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-10" />
//             <p className="text-lg font-medium">
//               No projects found matching your search.
//             </p>
//             <p className="text-sm opacity-60">
//               Try adjusting your filters or search query.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default HomePage;

const HomePage = () => {
  return (
    <div className="p-8 text-3xl min-h-screen flex justify-center items-center">
      {/* <h1 className="text-3xl font-bold mb-6">Welcome to Home</h1> */}
      <div className="space-y-4">
        {/* <p>This is your homepage with the sidebar and header layout.</p> */}
        <p>Welcome to WorkFlowPM</p>
        {/* Add your content here */}
      </div>
    </div>
  );
};

export default HomePage;
