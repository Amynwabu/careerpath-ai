import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ComboboxOption = {
  value: string;
  label: string;
  group?: string;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  className?: string;
};

export function Combobox({ value, onChange, options, placeholder, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const blurTimer = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options
      .filter((option) => `${option.label} ${option.group ?? ""}`.toLowerCase().includes(term))
      .slice(0, 80);
  }, [options, query]);

  const commit = (next: string) => {
    setQuery(next);
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          value={open ? query : value}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setQuery(value);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => {
              setOpen(false);
              setQuery(value);
            }, 120);
          }}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        />
        <button
          type="button"
          aria-label="Show options"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-xl">
          {query.trim() && !filtered.some((option) => option.label.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(query.trim())}
            >
              Use "{query.trim()}"
            </button>
          )}

          {filtered.length === 0 && !query.trim() && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No options available</div>
          )}

          {filtered.map((option) => (
            <button
              key={`${option.group ?? "option"}-${option.value}`}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(option.label)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{option.label}</span>
                {option.group && <span className="block truncate text-xs text-muted-foreground">{option.group}</span>}
              </span>
              {value === option.label && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
