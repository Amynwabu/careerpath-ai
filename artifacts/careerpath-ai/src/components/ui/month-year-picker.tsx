import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MonthYearPickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 71 }, (_, index) => CURRENT_YEAR + 5 - index);

function displayValue(value?: string) {
  if (!value) return "";
  try {
    return format(parseISO(value), "MMM yyyy");
  } catch {
    return value;
  }
}

export function MonthYearPicker({ value, onChange, placeholder = "Select month", className }: MonthYearPickerProps) {
  const selectedDate = value ? parseISO(value) : undefined;
  const selectedMonth = selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate.getMonth() : new Date().getMonth();
  const selectedYear = selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate.getFullYear() : CURRENT_YEAR;

  const commit = (year: number, month: number) => {
    onChange(`${year}-${String(month + 1).padStart(2, "0")}-01`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start rounded-md border-input bg-transparent px-3 text-left font-normal shadow-sm focus-visible:ring-1 focus-visible:ring-ring", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? displayValue(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => (
            <Button
              key={month}
              type="button"
              variant={index === selectedMonth ? "default" : "ghost"}
              className="h-9"
              onClick={() => commit(selectedYear, index)}
            >
              {month}
            </Button>
          ))}
        </div>
        <div className="mt-3 max-h-44 overflow-auto border-t border-border pt-3">
          <div className="grid grid-cols-4 gap-2">
            {YEARS.map((year) => (
              <Button
                key={year}
                type="button"
                variant={year === selectedYear ? "secondary" : "ghost"}
                className="h-9"
                onClick={() => commit(year, selectedMonth)}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
