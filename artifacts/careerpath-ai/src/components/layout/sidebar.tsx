import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  Target,
  Compass,
  Users,
  BrainCircuit,
  Map as MapIcon,
  Flag,
  History,
  LogOut,
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "My Profile", icon: User },
    { href: "/career-goal", label: "Career Goal", icon: Target },
    { href: "/journey-builder", label: "Journey Builder", icon: Compass },
    { href: "/analysis", label: "Career Analysis", icon: BrainCircuit },
    { href: "/roadmap", label: "Career Roadmap", icon: MapIcon },
    { href: "/milestones", label: "Milestones", icon: Flag },
    { href: "/advisors", label: "Advisors", icon: Users },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 left-0">
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center glow-box">
            <div className="w-4 h-4 border-2 border-primary-foreground rounded-sm" />
          </div>
          <span className="font-bold text-lg tracking-tight">CareerPath AI</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 glow-box"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 border-none"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
