import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/profile", label: "My Profile" },
    { href: "/career-goal", label: "Career Goal" },
    { href: "/journey-builder", label: "Journey Builder" },
    { href: "/analysis", label: "Career Analysis" },
    { href: "/roadmap", label: "Career Roadmap" },
    { href: "/milestones", label: "Milestones" },
    { href: "/advisors", label: "Advisors" },
    { href: "/history", label: "History" },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 left-0">
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <BrandMark />
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
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 glow-box"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
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
          Log Out
        </Button>
      </div>
    </div>
  );
}
