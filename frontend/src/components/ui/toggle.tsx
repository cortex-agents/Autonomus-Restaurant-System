import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Checked state of the toggle */
  checked?: boolean;
  /** Called when the checked state changes */
  onCheckedChange?: (checked: boolean) => void;
}

const Toggle = React.forwardRef<
  HTMLInputElement,
  ToggleProps
>(({ className, checked = false, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-border bg-background checked:bg-primary checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      ref={ref}
      {...props}
    />
  );
});
Toggle.displayName = "Toggle";

export { Toggle };