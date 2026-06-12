import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetProfile } from "@workspace/api-client-react";
import { getGetMeQueryKey, logout as logoutRequest } from "@workspace/api-client-react";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: profile } = useGetProfile();
  const profileHref = profile?.cvImportCompletedAt ? "/profile/manual" : "/profile/import";

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: profileHref, match: ["/profile", "/profile/import", "/profile/manual"], label: "My Profile" },
    { href: "/cv-studio", label: "Recreate CV" },
    { href: "/career-goal", label: "Career Goal" },
    { href: "/analysis", label: "Career Analysis" },
    { href: "/roadmap", label: "Career Roadmap" },
    { href: "/role-comparison", label: "Compare Roles" },
    { href: "/milestones", label: "Milestones" },
    { href: "/history", label: "History" },
  ];

  return (
    <div className={cn("w-64 h-screen bg-sidebar/95 border-r border-sidebar-border flex flex-col sticky top-0 left-0", className)}>
      <div className="flex h-24 items-center px-6 border-b border-sidebar-border">
        <Logo size="sm" />
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href || item.match?.includes(location);
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <span>{item.label}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 border-none"
          onClick={async () => {
            try {
              await logoutRequest();
            } finally {
              queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
              onNavigate?.();
              setLocation("/login");
            }
          }}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
