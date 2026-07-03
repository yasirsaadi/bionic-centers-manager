import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "primary" | "accent" | "blue" | "green";
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, trend, color = "primary", className, onClick }: StatsCardProps) {
  const colorStyles = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-emerald-500/10 text-emerald-600",
  };

  // Currency strings (e.g. "677,959,250 د.ع") are long, so they get a smaller
  // one-line-friendly size. The number itself never breaks mid-digits (no
  // break-words); if space is ever tight it wraps only at the space before the
  // currency unit. Plain counts stay large and prominent.
  const isLongValue = typeof value === "string" && value.length > 11;

  return (
    <div
      className={cn(
        "bg-white rounded-xl md:rounded-2xl p-3 md:p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col",
        onClick && "cursor-pointer hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className={cn("inline-flex w-fit p-2 md:p-2.5 rounded-lg md:rounded-xl mb-2 md:mb-3", colorStyles[color])}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <p className="text-xs md:text-sm text-muted-foreground font-medium leading-snug line-clamp-2 min-h-[2.5em]">
        {title}
      </p>
      <h3
        className={cn(
          "mt-1 font-bold font-display text-slate-800 tracking-tight leading-snug tabular-nums",
          isLongValue ? "text-base md:text-lg" : "text-xl md:text-3xl"
        )}
      >
        {value}
      </h3>
      {trend && (
        <p className="text-xs text-emerald-600 font-medium mt-1 md:mt-2 flex items-center gap-1">
          {trend}
        </p>
      )}
    </div>
  );
}
