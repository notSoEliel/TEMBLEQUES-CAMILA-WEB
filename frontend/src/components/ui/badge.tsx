import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-primary text-primary-foreground border-border",
      secondary: "bg-secondary text-secondary-foreground border-border",
      destructive: "bg-destructive text-destructive-foreground border-border",
      outline: "bg-transparent text-foreground border-border",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border-2 px-2.5 py-0.5 text-xs font-bold transition-colors",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
