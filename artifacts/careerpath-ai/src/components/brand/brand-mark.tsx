import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
};

const sizes = {
  sm: "h-7 w-7 [&>span]:h-3.5 [&>span]:w-3.5",
  md: "h-8 w-8 [&>span]:h-4 [&>span]:w-4",
  lg: "h-12 w-12 [&>span]:h-6 [&>span]:w-6",
};

export function BrandMark({ className, size = "md", variant = "solid" }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded",
        sizes[size],
        variant === "solid"
          ? "bg-primary shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          : "border border-primary/30 bg-primary/10",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-sm border-2",
          variant === "solid" ? "border-primary-foreground" : "border-primary",
        )}
      />
    </span>
  );
}
