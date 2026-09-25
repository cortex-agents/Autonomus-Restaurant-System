import * as React from "react";

interface OrderStatusBadgeProps {
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  className?: string;
}

const getStatusVariants = (status: OrderStatusBadgeProps['status']) => {
  switch (status) {
    case 'pending':
      return "bg-accent/10 text-accent";
    case 'confirmed':
      return "bg-primary/10 text-primary";
    case 'preparing':
      return "bg-muted/10 text-muted";
    case 'out_for_delivery':
      return "bg-accent/20 text-accent";
    case 'delivered':
      return "bg-primary/20 text-primary";
    case 'cancelled':
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted/10 text-muted";
  }
};

const getStatusLabel = (status: OrderStatusBadgeProps['status']) => {
  switch (status) {
    case 'pending':
      return "Pending";
    case 'confirmed':
      return "Confirmed";
    case 'preparing':
      return "Preparing";
    case 'out_for_delivery':
      return "Out for Delivery";
    case 'delivered':
      return "Delivered";
    case 'cancelled':
      return "Cancelled";
    default:
      return "Unknown";
  }
};

export const OrderStatusBadge = ({
  status,
  className,
}: OrderStatusBadgeProps) => {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusVariants(
        status
      )} ${className ?? ""}`}
    >
      {getStatusLabel(status)}
    </span>
  );
};