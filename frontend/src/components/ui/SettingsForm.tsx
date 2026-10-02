import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { formatCurrency } from "@/lib/format";

interface SettingsFormProps {
  settings: {
    opening_time: string | null;
    closing_time: string | null;
    delivery_radius_km: number | null;
    delivery_fee: number | null;
    min_order_amount: number | null;
    brand_voice: string | null;
    timezone: string | null;
  };
  onChange: (field: keyof typeof SettingsForm.prototype.defaultSettings, value: any) => void;
  isUpdating: boolean;
  restaurantName: string;
}

interface SettingsFormState {
  opening_time: string;
  closing_time: string;
  delivery_radius_km: string;
  delivery_fee: string;
  min_order_amount: string;
  brand_voice: string;
  timezone: string;
}

export const SettingsForm = ({
  settings,
  onChange,
  isUpdating,
  restaurantName,
}: SettingsFormProps) => {
  const [formState, setFormState] = React.useState<SettingsFormState>({
    opening_time: settings.opening_time ?? "",
    closing_time: settings.closing_time ?? "",
    delivery_radius_km: settings.delivery_radius_km?.toString() ?? "",
    delivery_fee: settings.delivery_fee?.toString() ?? "",
    min_order_amount: settings.min_order_amount?.toString() ?? "",
    brand_voice: settings.brand_voice ?? "",
    timezone: settings.timezone ?? "",
  });

  const handleChange = (field: keyof SettingsFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Convert and pass to parent onChange handler
    let convertedValue: any = value;
    switch (field) {
      case "delivery_radius_km":
      case "delivery_fee":
      case "min_order_amount":
        convertedValue = value === "" ? null : parseFloat(value);
        break;
      default:
        convertedValue = value === "" ? null : value;
    }
    onChange(field, convertedValue);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    // Ensure HH:MM format
    const [hours, minutes] = timeStr.split(":");
    if (hours && minutes) {
      return `${hours.padStart(2, "0")}:${minutes.padEnd(2, "0")}`;
    }
    return timeStr;
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <div className="border rounded-lg p-4 bg-card shadow-sm">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Restaurant: {restaurantName}
        </h3>

        {/* Operational Hours */}
        <div className="border-b border-border pb-4 mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Operational Hours
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Opening Time
              </label>
              <Input
                type="time"
                value={formatTime(formState.opening_time)}
                onChange={(e) => handleChange("opening_time", e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Closing Time
              </label>
              <Input
                type="time"
                value={formatTime(formState.closing_time)}
                onChange={(e) => handleChange("closing_time", e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="border-b border-border pb-4 mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Delivery Settings
          </h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-40 text-xs text-muted-foreground">
                Delivery Radius (km)
              </label>
              <Input
                type="number"
                value={formState.delivery_radius_km}
                onChange={(e) => handleChange("delivery_radius_km", e.target.value)}
                min="0"
                step="0.1"
                placeholder="e.g., 5.0"
                disabled={isUpdating}
                className="w-24"
              />
              <span className="ml-2 text-xs text-muted-foreground">
                kilometers
              </span>
            </div>
            <div className="flex items-center">
              <label className="w-40 text-xs text-muted-foreground">
                Delivery Fee
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">₨</span>
                <Input
                  type="number"
                  value={formState.delivery_fee}
                  onChange={(e) => handleChange("delivery_fee", e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isUpdating}
                  className="w-20"
                />
              </div>
              <span className="ml-2 text-xs text-muted-foreground">
                per order
              </span>
            </div>
            <div className="flex items-center">
              <label className="w-40 text-xs text-muted-foreground">
                Minimum Order Amount
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">₨</span>
                <Input
                  type="number"
                  value={formState.min_order_amount}
                  onChange={(e) =>
                    handleChange("min_order_amount", e.target.value)
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isUpdating}
                  className="w-20"
                />
              </div>
              <span className="ml-2 text-xs text-muted-foreground">
                per order
              </span>
            </div>
          </div>
        </div>

        {/* Brand & Localization */}
        <div className="border-b border-border pb-4 mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Brand & Localization
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Brand Voice
              </label>
              <Input
                type="text"
                value={formState.brand_voice}
                onChange={(e) => handleChange("brand_voice", e.target.value)}
                placeholder="Describe your restaurant's personality..."
                disabled={isUpdating}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Timezone
              </label>
              <Input
                type="text"
                value={formState.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                placeholder="e.g., Asia/Karachi"
                disabled={isUpdating}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => {
            // Reset form to current settings
            setFormState({
              opening_time: settings.opening_time ?? "",
              closing_time: settings.closing_time ?? "",
              delivery_radius_km: settings.delivery_radius_km?.toString() ?? "",
              delivery_fee: settings.delivery_fee?.toString() ?? "",
              min_order_amount: settings.min_order_amount?.toString() ?? "",
              brand_voice: settings.brand_voice ?? "",
              timezone: settings.timezone ?? "",
            });
          }}
          disabled={isUpdating}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isUpdating}
          className="ml-4"
          onClick={(e) => {
            e.preventDefault();
            // Form submission handled by parent via onChange callbacks
          }}
        >
          {isUpdating ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
};