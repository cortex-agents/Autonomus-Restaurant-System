import * as React from "react";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STYLES: Record<OrderStatus, { label: string; chip: string; dot: string }> = {
  pending: {
    label: "Pending",
    chip: "bg-warning/10 text-warning ring-warning/25",
    dot: "bg-warning animate-pulse",
  },
  confirmed: {
    label: "Confirmed",
    chip: "bg-info/10 text-info ring-info/25",
    dot: "bg-info",
  },
  preparing: {
    label: "Preparing",
    chip: "bg-accent/10 text-accent ring-accent/25",
    dot: "bg-accent",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    chip: "bg-primary/10 text-primary ring-primary/25",
    dot: "bg-primary",
  },
  delivered: {
    label: "Delivered",
    chip: "bg-success/10 text-success ring-success/25",
    dot: "bg-success",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-destructive/10 text-destructive ring-destructive/25",
    dot: "bg-destructive",
  },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [k, v.label])
) as Record<OrderStatus, string>;

export const OrderStatusBadge = ({ status, className }: OrderStatusBadgeProps) => {
  const s = STYLES[status] ?? {
    label: "Unknown",
    chip: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.chip} ${className ?? ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};
