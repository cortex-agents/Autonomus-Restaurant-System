import * as React from "react";

interface EscalationStatusBadgeProps {
  status: "open" | "acknowledged" | "resolved";
  className?: string;
}

const getStatusVariants = (status: EscalationStatusBadgeProps['status']) => {
  switch (status) {
    case 'open':
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case 'acknowledged':
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case 'resolved':
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getStatusLabel = (status: EscalationStatusBadgeProps['status']) => {
  switch (status) {
    case 'open':
      return "Open";
    case 'acknowledged':
      return "Acknowledged";
    case 'resolved':
      return "Resolved";
    default:
      return "Unknown";
  }
};

export const EscalationStatusBadge = ({
  status,
  className,
}: EscalationStatusBadgeProps) => {
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