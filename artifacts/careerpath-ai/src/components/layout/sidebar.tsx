import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: "border-cyan-400/50 bg-cyan-400/15 text-cyan-200",
      idle: "border-cyan-400/15 text-cyan-200/70 hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-cyan-100",
    },
    {
      href: "/profile",
      label: "My Profile",
      active: "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
      idle: "border-emerald-400/15 text-emerald-200/70 hover:border-emerald-400/35 hover:bg-emerald-400/10 hover:text-emerald-100",
    },
    {
      href: "/career-goal",
      label: "Career Goal",
      active: "border-amber-400/50 bg-amber-400/15 text-amber-200",
      idle: "border-amber-400/15 text-amber-200/70 hover:border-amber-400/35 hover:bg-amber-400/10 hover:text-amber-100",
    },
    {
      href: "/journey-builder",
      label: "Journey Builder",
      active: "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200",
      idle: "border-fuchsia-400/15 text-fuchsia-200/70 hover:border-fuchsia-400/35 hover:bg-fuchsia-400/10 hover:text-fuchsia-100",
    },
    {
      href: "/analysis",
      label: "Career Analysis",
      active: "border-sky-400/50 bg-sky-400/15 text-sky-200",
      idle: "border-sky-400/15 text-sky-200/70 hover:border-sky-400/35 hover:bg-sky-400/10 hover:text-sky-100",
    },
    {
      href: "/roadmap",
      label: "Career Roadmap",
      active: "border-violet-400/50 bg-violet-400/15 text-violet-200",
      idle: "border-violet-400/15 text-violet-200/70 hover:border-violet-400/35 hover:bg-violet-400/10 hover:text-violet-100",
    },
    {
      href: "/milestones",
      label: "Milestones",
      active: "border-lime-400/50 bg-lime-400/15 text-lime-200",
      idle: "border-lime-400/15 text-lime-200/70 hover:border-lime-400/35 hover:bg-lime-400/10 hover:text-lime-100",
    },
    {
      href: "/advisors",
      label: "Advisors",
      active: "border-rose-400/50 bg-rose-400/15 text-rose-200",
      idle: "border-rose-400/15 text-rose-200/70 hover:border-rose-400/35 hover:bg-rose-400/10 hover:text-rose-100",
    },
    {
      href: "/history",
      label: "History",
      active: "border-orange-400/50 bg-orange-400/15 text-orange-200",
      idle: "border-orange-400/15 text-orange-200/70 hover:border-orange-400/35 hover:bg-orange-400/10 hover:text-orange-100",
    },
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
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center border px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive ? item.active : item.idle,
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
