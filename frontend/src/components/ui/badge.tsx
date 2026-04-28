import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary/60 text-secondary-foreground border border-secondary/40",
    destructive: "bg-red-50 text-red-700 border border-red-200",
    outline: "bg-transparent text-foreground border border-border",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
