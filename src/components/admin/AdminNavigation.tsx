import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Trophy, Megaphone, Settings, BarChart3, DollarSign, Users, Briefcase, LifeBuoy } from "lucide-react";
import { format } from "date-fns";

interface AdminNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  pendingCount: number;
}

export function AdminNavigation({
  activeSection,
  onSectionChange,
  pendingCount,
}: AdminNavigationProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    {
      id: "contests",
      label: "Contests",
      icon: Trophy,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "accounts", label: "Accounts", icon: Users },
    { id: "advertisers", label: "Advertisers", icon: Briefcase },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "services", label: "Services", icon: LifeBuoy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="w-64 bg-card border-r border-border p-4 flex flex-col h-screen">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-primary">Admin Panel</h2>
        <p className="text-xs text-muted-foreground">Manage your app</p>
      </div>
      
      <div className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className="w-full justify-start gap-2 relative"
            onClick={() => onSectionChange(item.id)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Footer with date and time */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Today: {format(currentTime, "MMM d, yyyy")}</p>
          <p>Time: {format(currentTime, "HH:mm:ss")}</p>
        </div>
      </div>
    </nav>
  );
}
