// import { useState, useEffect } from "react";
// import { Button } from "@/shared/ui/button";
// import { Card } from "@/shared/ui/card";
// import { Plus } from "lucide-react";

// interface Habit {
//   id: string;
//   name: string;
//   frequency: string;
//   completionRate: number;
//   streak: number;
//   lastCompleted?: string;
// }

// export default function MyHabits() {
//   const [habits] = useState<Habit[]>([]);

//   useEffect(() => {
//     // TODO: Fetch habits from REST API
//   }, []);

//   return (
//     <div className="min-h-screen p-8">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex items-center justify-between mb-8">
//           <h1 className="text-3xl font-bold">My Habits</h1>
//           <Button size="sm">
//             <Plus className="h-4 w-4 mr-2" />
//             Create Habit
//           </Button>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {habits.length === 0 ? (
//             <div className="col-span-full text-center py-8 text-muted-foreground">
//               <p>No habits created yet</p>
//             </div>
//           ) : (
//             habits.map((habit) => (
//               <Card key={habit.id} className="p-6">
//                 <div className="space-y-4">
//                   <div>
//                     <h3 className="font-semibold text-lg">{habit.name}</h3>
//                     <p className="text-sm text-muted-foreground">{habit.frequency}</p>
//                   </div>
//                   <div className="space-y-2">
//                     <div>
//                       <p className="text-xs text-muted-foreground">Completion Rate</p>
//                       <div className="w-full bg-secondary h-2 rounded-full mt-1">
//                         <div
//                           className="h-full bg-green-500 rounded-full"
//                           style={{ width: `${habit.completionRate}%` }}
//                         />
//                       </div>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-muted-foreground">
//                         Streak: {habit.streak} days
//                       </span>
//                       {habit.lastCompleted && (
//                         <span className="text-muted-foreground">
//                           Last: {habit.lastCompleted}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </Card>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

export default function MyHabits() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Coming Soon</h1>
        {/* <p className="text-lg text-muted-foreground">
          My Habits feature is under development
        </p> */}
      </div>
    </div>
  );
}
