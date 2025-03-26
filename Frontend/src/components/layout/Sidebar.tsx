import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  LayoutDashboard,
  ChevronLeft,
  PlusCircle,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";

// Define nav item type
interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  requiresAdminForFullAccess?: boolean;
}

// Define base nav items that are visible to all users
const baseNavItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

// Settings is special - it's visible to everyone but has admin features
const settingsNavItem: NavItem = { 
  path: "/settings", 
  label: "Settings", 
  icon: Settings, 
  requiresAdminForFullAccess: true 
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, isAdmin, logout } = useAuth();
  const { settings } = useAdminSettings();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();
  
  // All nav items including conditional ones
  const mainNavItems = [...baseNavItems, settingsNavItem];

  const getUserInitials = () => {
    if (!currentUser?.displayName) return "U";
    return currentUser.displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const SidebarContent = () => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.photoURL || undefined} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.displayName || "User"}</span>
              <span className="text-xs text-muted-foreground">{currentUser?.email}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {baseNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {!collapsed && item.label}
            </Link>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="px-2 space-y-1">
          <Link
            to={settingsNavItem.path}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === settingsNavItem.path
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => setIsMobileOpen(false)}
          >
            <settingsNavItem.icon className="h-4 w-4 mr-3" />
            {!collapsed && settingsNavItem.label}
            {!collapsed && isAdmin && (
              <Badge variant="secondary" className="ml-2">
                Admin
              </Badge>
            )}
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            handleLogout();
            setIsMobileOpen(false);
          }}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <SidebarContent />
      </div>
    </>
  );
}
