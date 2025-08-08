import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Ticket, 
  Plus, 
  Settings,
  HelpCircle,
  Users,
  LogOut
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  const getNavigation = () => {
    const baseNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
      { name: "Tickets", href: "/tickets", icon: Ticket, roles: ["admin", "engineer", "reporter"] },
    ];

    // Add role-specific navigation items
    if (user.role === "admin") {
      baseNav.push(
        { name: "New Ticket", href: "/tickets/new", icon: Plus, roles: ["admin"] },
        { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
        { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] }
      );
    } else if (user.role === "reporter") {
      baseNav.push(
        { name: "New Ticket", href: "/tickets/new", icon: Plus, roles: ["reporter"] }
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
              <HelpCircle className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Helpdesk
              </span>
            </div>
            
            {/* User Info */}
            <div className="px-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
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
