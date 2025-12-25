import { useState } from "react";
import { SidebarTrigger, useSidebar } from "@/shared/components/ui/sidebar";
import { Trash2, Settings, User, Users, LogOut, UserPlus, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { useTestUser } from "@/contexts/TestUserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/shared/components/ui/dropdown-menu";

export function Header() {
  const { open } = useSidebar();
  const { currentUser, testUsers, switchUser } = useTestUser();
  
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {!open && <SidebarTrigger />}
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10">
              <Avatar className="h-8 w-8">
                <AvatarFallback style={{ backgroundColor: currentUser.avatarColor }}>
                  {currentUser.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser.name}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Switch User</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {testUsers.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => switchUser(user.id)}
                className={currentUser.id === user.id ? "bg-accent" : ""}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4 mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="h-4 w-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
