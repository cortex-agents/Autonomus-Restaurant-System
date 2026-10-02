import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toggleItemAvailability } from "@/hooks/useMenu";
import { Toggle } from "@/components/ui/toggle";

interface AvailabilityToggleProps {
  itemId: string;
  isAvailable: boolean;
  className?: string;
  disabled?: boolean;
}

const AvailabilityToggle = ({
  itemId,
  isAvailable,
  className,
  disabled = false,
}: AvailabilityToggleProps) => {
  const { mutate: toggleAvailability, isPending } = useMutation({
    mutationFn: () => toggleItemAvailability(itemId, !isAvailable),
    onSuccess: (updatedItem) => {
      // In a real implementation, we'd update the item state
      console.log("Availability toggled:", updatedItem);
    },
  });

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-foreground/80">
        Available
      </span>
      <Toggle
        checked={isAvailable}
        onCheckedChange={(checked) => toggleAvailability()}
        disabled={disabled || isPending}
        className={className}
      />
      {isPending && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary">
        </span>
      )}
    </div>
  );
};

export default AvailabilityToggle;