import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "muted" | "accent";
}

const Badge = React.forwardRef<
  HTMLSpanElement,
  BadgeProps
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        {
          default: "border-border text-background",
          secondary: "border-secondary text-secondary-foreground",
          destructive:
            "border-destructive text-destructive-foreground",
          muted: "border-muted text-muted-foreground",
          accent: "border-accent text-accent-foreground",
        }[variant],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };