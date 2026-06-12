import { useState } from "react";
import { Sidebar } from "./sidebar";
import { motion } from "framer-motion";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      <div className="app-console-backdrop" aria-hidden="true" />
      <div className="relative z-20 hidden md:block">
        <Sidebar />
      </div>
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/35 bg-background/92 px-4 backdrop-blur md:hidden">
        <Logo size="sm" />
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open navigation menu" className="border-white/35">
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-primary/55 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">CareerPath AI main navigation</SheetDescription>
            <Sidebar className="static h-full w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <motion.main
        className="relative z-10 flex-1 overflow-auto pt-16 md:pt-0"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        {children}
      </motion.main>
    </div>
  );
}
