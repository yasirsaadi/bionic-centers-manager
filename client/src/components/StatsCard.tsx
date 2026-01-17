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

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300",
        onClick && "cursor-pointer hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold font-display text-slate-800 tracking-tight">{value}</h3>
          {trend && (
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
