import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SystemLogo from "./SystemLogo";
import { 
  LayoutDashboard, 
  Ticket, 
  Plus, 
  Settings,
  Users,
  LogOut,
  Wifi,
  WifiOff,
  Package,
  ScanLine
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  const getNavigation = () => {
    const baseNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "engineer"] },
      { name: "Tickets", href: "/tickets", icon: Ticket, roles: ["admin", "engineer", "reporter"] },
    ];

    // Add role-specific navigation items
    if (user.role === "admin" || user.role === "engineer") {
      baseNav.push(
        { name: "Asset Dashboard", href: "/assets/dashboard", icon: LayoutDashboard, roles: ["admin", "engineer"] },
        { name: "Assets", href: "/assets", icon: Package, roles: ["admin", "engineer"] },
        { name: "Asset Audit", href: "/assets/audit", icon: ScanLine, roles: ["admin", "engineer"] }
      );
    } else if (user.role === "reporter") {
      baseNav.push(
        { name: "Assets", href: "/assets", icon: Package, roles: ["reporter"] }
      );
    }

    if (user.role === "admin") {
      baseNav.push(
        { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
        { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] }
      );
    }

    return baseNav.filter(item => item.roles.includes(user.role));
  };

  const navigation = getNavigation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex items-center flex-shrink-0 px-4">
              <SystemLogo />
            </div>
            
            {/* Connection Status */}
            <div className="px-4 mt-4">
              <div className={`flex items-center space-x-2 p-2 rounded-md ${
                isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {isOnline ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            {/* User Info */}
            <div className="px-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {isAuthenticated ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "mr-3 flex-shrink-0 h-5 w-5",
                          isActive ? "text-blue-500" : "text-gray-400"
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              
              {/* Session Info */}
              <div className="px-4 pb-2">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Session: Active</p>
                  <p>Auto-refresh: Every 30min</p>
                </div>
              </div>
              
              {/* Logout Button */}
              <div className="px-2 pb-4">
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="w-full justify-start text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
              <WifiOff className="w-4 h-4 inline mr-2" />
              You are currently offline. Some features may not work properly.
            </div>
          )}
          
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
