import { Bell, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <SidebarTrigger className="text-foreground" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">PM</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Project Manager</h1>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" className="text-foreground/90 hover:text-foreground">
              Dashboard
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-pink-500 hover:bg-pink-500">
              29
            </Badge>
          </Button>
          
          <Button variant="ghost" size="icon">
            <Sun className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 border-l border-border/50 pl-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">client@example.com</p>
              <p className="text-xs text-muted-foreground">Client</p>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
