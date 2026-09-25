import * as React from "react";

interface OrderStatusBadgeProps {
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  className?: string;
}

const getStatusVariants = (status: OrderStatusBadgeProps['status']) => {
  switch (status) {
    case 'pending':
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case 'confirmed':
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case 'preparing':
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case 'out_for_delivery':
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case 'delivered':
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case 'cancelled':
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
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