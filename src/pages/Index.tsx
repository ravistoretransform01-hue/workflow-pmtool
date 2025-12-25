import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GroupData {
  id: string;
  name: string;
  boardId: string;
  boardName: string;
  workspaceId: string;
  timeSpentSeconds: number;
  estimatedTimeSeconds: number;
  memberCount: number;
  status: "active" | "completed" | "on-hold";
}

export default function Index() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch dashboard data from REST API
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder dashboard cards */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">My Items</h3>
            <p className="text-muted-foreground text-sm">View your assigned items</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">My Team</h3>
            <p className="text-muted-foreground text-sm">Team members and collaboration</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">All Items</h3>
            <p className="text-muted-foreground text-sm">View all workspace items</p>
          </div>
        </div>
      </div>
    </div>
  );
}
