import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const COMMANDS = [
  { label: "Run Analysis", path: "/analysis", hint: "Generate readiness and gaps" },
  { label: "View Roadmap", path: "/roadmap", hint: "Open your career phases" },
  { label: "Edit Profile", path: "/profile/manual", hint: "Update career evidence" },
  { label: "Set Career Goal", path: "/career-goal", hint: "Choose target role" },
  { label: "View Milestones", path: "/milestones", hint: "Track next actions" },
  { label: "Analysis History", path: "/history", hint: "Review previous scores" },
];

export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCommandK) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((command) =>
      `${command.label} ${command.hint}`.toLowerCase().includes(q),
    );
  }, [query]);

  const run = (path: string) => {
    setOpen(false);
    setQuery("");
    setLocation(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="blue-card-strong p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-primary/20 px-5 py-4">
          <DialogTitle className="font-mono text-sm uppercase tracking-[0.22em] text-primary">Command Palette</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Input
            autoFocus
            placeholder="Search actions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) run(results[0].path);
            }}
            className="border-primary/30 bg-background"
          />
          <div className="mt-3 grid gap-2">
            {results.map((command) => (
              <button
                key={command.path}
                type="button"
                onClick={() => run(command.path)}
                className="rounded-lg border border-primary/15 bg-primary/10 px-4 py-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="block font-semibold">{command.label}</span>
                <span className="text-sm text-muted-foreground">{command.hint}</span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">No matching command.</p>
            )}
          </div>
          <p className="mt-4 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Cmd/Ctrl + K to open</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
