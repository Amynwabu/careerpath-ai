import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Compass,
  Flag,
  History,
  LayoutDashboard,
  LogOut,
  Route,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/career-goal", label: "Career Goal", icon: Flag },
  { href: "/journey-builder", label: "Career Journey", icon: Compass },
  { href: "/analysis", label: "Your Analysis", icon: BarChart3 },
  { href: "/roadmap", label: "Your Roadmap", icon: Route },
  { href: "/milestones", label: "Progress", icon: BookOpenCheck },
  { href: "/advisors", label: "Support", icon: UsersRound },
  { href: "/history", label: "Past Results", icon: History },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        "sticky left-0 top-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#080b0d]",
        className,
      )}
    >
      <div className="flex h-20 items-center border-b border-white/[0.07] px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <BrandMark />
          <div>
            <span className="block text-base font-semibold text-white">CareerPathX</span>
            <span className="block text-[10px] font-medium uppercase text-primary/70">Career plan</span>
          </div>
        </Link>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Dashboard</p>
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors",
                  "hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white",
                  isActive && "border-primary/25 bg-primary/[0.08] text-primary",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-2 left-0 w-px bg-transparent",
                    isActive && "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)]",
                  )}
                />
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <Button
          variant="ghost"
          className="w-full justify-start border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-white"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
