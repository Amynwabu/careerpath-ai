import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  colorClass?: string;
  label?: string;
  showValue?: boolean;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  className,
  colorClass = "text-primary",
  label,
  showValue = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center flex-col", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-1000 ease-in-out", colorClass, "stroke-current")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showValue && (
          <span className="text-3xl font-bold tracking-tighter">
            {Math.round(value)}<span className="text-lg text-muted-foreground">%</span>
          </span>
        )}
        {label && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
        )}
      </div>
    </div>
  );
}
