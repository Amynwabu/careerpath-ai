import { Link } from "wouter";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "mark";
  href?: string;
  className?: string;
};

const sizeStyles = {
  sm: {
    root: "gap-2.5",
    mark: "h-8 w-8 rounded-lg",
    inner: "h-4 w-4 rounded-[4px] border-2",
    wordmark: "text-base",
  },
  md: {
    root: "gap-3",
    mark: "h-10 w-10 rounded-xl",
    inner: "h-5 w-5 rounded-md border-2",
    wordmark: "text-xl",
  },
  lg: {
    root: "gap-3.5",
    mark: "h-12 w-12 rounded-2xl",
    inner: "h-6 w-6 rounded-lg border-[3px]",
    wordmark: "text-2xl",
  },
};

export function Logo({ size = "md", variant = "full", href = "/", className }: LogoProps) {
  const styles = sizeStyles[size];

  return (
    <Link
      href={href}
      aria-label="Go to home page"
      className={cn(
        "inline-flex items-center rounded-xl outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        styles.root,
        className,
      )}
    >
      <span className={cn("flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.35)]", styles.mark)}>
        <span className={cn("border-primary-foreground", styles.inner)} />
      </span>
      {variant === "full" && (
        <span className="leading-none">
          <span className={cn("block font-bold tracking-tight text-foreground", styles.wordmark)}>CareerPath AI</span>
        </span>
      )}
    </Link>
  );
}
