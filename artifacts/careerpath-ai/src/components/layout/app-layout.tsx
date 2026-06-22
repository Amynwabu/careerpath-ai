import { useState, type FormEvent } from "react";
import { Bell, Bot, ChevronDown, Menu, Search, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Sidebar, navigationItems } from "./sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [command, setCommand] = useState("");

  const initials = user?.name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CP";

  const handleCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = command.trim().toLowerCase();
    if (!normalized) return;

    const destination = navigationItems.find((item) =>
      item.label.toLowerCase().includes(normalized),
    );
    setLocation(destination?.href ?? "/analysis");
    setCommand("");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar className="hidden lg:flex" />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 border-white/[0.07] bg-[#080b0d] p-0">
          <Sidebar className="static h-full w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-background/95 px-4 backdrop-blur-xl sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <form onSubmit={handleCommand} className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              aria-label="Quick command"
              placeholder="Search or jump to a workspace..."
              className="h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.025] pl-10 pr-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/35 focus:bg-white/[0.04]"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              ENTER
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="hidden border-white/[0.06] text-muted-foreground hover:text-primary sm:inline-flex">
                  <Link href="/advisors" aria-label="Open AI advisor">
                    <Bot className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI advisor</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="border-white/[0.06] text-muted-foreground hover:text-primary" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-72 border-white/10 bg-[#0d1114] p-3">
                <DropdownMenuLabel className="px-1 text-xs uppercase text-muted-foreground">Signals</DropdownMenuLabel>
                <p className="px-1 py-3 text-sm leading-6 text-muted-foreground">Your next career action is ready in Mission Control.</p>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 border-white/[0.06] px-1.5 hover:bg-white/[0.04]" aria-label="Open profile menu">
                  <Avatar className="h-7 w-7 border border-primary/25">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0d1114]">
                <DropdownMenuLabel>
                  <span className="block text-sm text-foreground">{user?.name ?? "CareerPathX member"}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email ?? "Your workspace"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserRound className="h-4 w-4" />
                    My profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onSelect={() => logout()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
