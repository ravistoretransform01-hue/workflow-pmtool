import { ClipboardList, Plus, FolderOpen, Settings, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Tasks", icon: ClipboardList, url: "/dashboard" },
  { title: "Team Management", icon: Users, url: "/team" },
  { title: "Create Project", icon: Plus, url: "/dashboard/create" },
  { title: "Your Projects", icon: FolderOpen, url: "/dashboard/projects" },
  { title: "Account", icon: Settings, url: "/dashboard/account" },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className="bg-black border-r border-white/10" collapsible="icon">
      <SidebarContent className="pt-6 bg-black">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-white/10">
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-4 py-3 text-white/70"
                      activeClassName="bg-white/10 text-white"
                    >
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
