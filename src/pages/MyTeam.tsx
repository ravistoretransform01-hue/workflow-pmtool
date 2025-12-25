import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  tasksCount: number;
  completedTasks: number;
}

export default function MyTeam() {
  const [members] = useState<TeamMember[]>([]);

  useEffect(() => {
    // TODO: Fetch team members from REST API
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Team</h1>
          <Button size="sm">Invite Member</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p>No team members yet</p>
            </div>
          ) : (
            members.map((member) => (
              <Card key={member.id} className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback style={{ backgroundColor: member.avatarColor }}>
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <Badge className="mt-2">{member.role}</Badge>
                    <div className="mt-4 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Tasks: {member.tasksCount}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed: {member.completedTasks}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
