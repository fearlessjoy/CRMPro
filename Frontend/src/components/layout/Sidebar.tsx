import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { Badge } from "@/components/ui/badge";

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
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, isAdmin } = useAuth();
  const { settings } = useAdminSettings();
  
  // All nav items including conditional ones
  const mainNavItems = [...baseNavItems, settingsNavItem];

  return (
    <div 
      className={cn(
        "h-screen border-r bg-card flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {settings?.companyLogo ? (
              <img 
                src={settings.companyLogo} 
                alt={settings.companyName || 'CRM Pro'} 
                className="h-8 w-auto"
              />
            ) : (
              <div className="flex">
                <div className="w-2 h-2 rounded-full bg-crm-red"></div>
                <div className="w-2 h-2 rounded-full bg-crm-blue ml-0.5"></div>
                <div className="w-2 h-2 rounded-full bg-crm-red ml-0.5"></div>
              </div>
            )}
            <span 
              className="font-semibold text-lg"
              style={{ color: settings?.primaryColor || 'var(--crm-blue)' }}
            >
              {settings?.companyName || 'CRM Pro'}
            </span>
          </div>
        )}
        {settings?.companyLogo && collapsed && (
          <img 
            src={settings.companyLogo} 
            alt={settings.companyName || 'CRM Pro'} 
            className="h-8 w-auto mx-auto"
          />
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto p-1 h-7 w-7" 
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {mainNavItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "sidebar-menu-item group",
                location.pathname === item.path && "active",
                location.pathname.startsWith(item.path) && item.path !== "/" && "active"
              )}
            >
              <item.icon className="sidebar-menu-icon" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.label}</span>
                  {item.requiresAdminForFullAccess && isAdmin() && !collapsed && (
                    <Badge variant="outline" className="ml-2 px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      <span className="text-[10px]">Admin</span>
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          ))}
        </nav>
        
        {!collapsed && (
          <div className="mt-6 px-4">
            <Button className="w-full gap-2 justify-start" size="sm" asChild>
              <Link to="/leads/new">
                <PlusCircle className="h-4 w-4" />
                Add Lead
              </Link>
            </Button>
          </div>
        )}

        {collapsed && (
          <div className="mt-6 px-2">
            <Button className="w-full h-8 p-0 flex items-center justify-center" size="icon" variant="default" asChild>
              <Link to="/leads/new">
                <PlusCircle className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.displayName || 'User'}</span>
              <span className="text-xs text-muted-foreground">
                {isAdmin() ? 'Admin' : 'User'}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" asChild>
              <Link to="/logout">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );
}
