import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
} from "@/shared/components/ui/sidebar";
import { BarChart3, Home, Users, FolderKanban, Settings, LogOut, CheckSquare, Briefcase, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const AppSidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/home" },
    { icon: CheckSquare, label: "My Work", href: "/my-work" },
    { icon: Users, label: "My Team", href: "/my-team" },
    { icon: FolderKanban, label: "All Items", href: "/all-items" },
    { icon: Briefcase, label: "My Habits", href: "/my-habits" },
  ];

  const handleLogout = () => {
    // Add logout logic here
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-bold text-lg">PM Tool</h1>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild>
                <Link to={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
