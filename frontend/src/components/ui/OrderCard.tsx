import * as React from "react";
import { formatCurrency } from "@/lib/format";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderCardProps {
  order: {
    id: string;
    customer_name: string;
    customer_phone: string;
    items: {
      id: string;
      name: string;
      quantity: number;
      price: number;
      total: number;
      special_instructions?: string | null;
    }[];
    total_amount: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
    created_at: string;
    updated_at: string;
  };
  onStatusChange?: (id: string, status: string) => void;
  className?: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const OrderCard = ({
  order,
  onStatusChange,
  className = "",
}: OrderCardProps) => {
  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(order.id, newStatus as any);
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-medium text-foreground dark:text-[#e2e8f0]">
            Order #{order.id.slice(0, 8)}
          </h3>
          <p className="font-body text-sm text-muted-foreground dark:text-muted">
            {order.customer_name}
          </p>
          {order.items.length > 0 && (
            <div className="mt-2">
              <h4 className="font-display text-xs font-medium text-muted-foreground dark:text-muted mb-1">
                Items:
              </h4>
              <div className="text-sm space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="font-body">{item.name} x{item.quantity}</span>
                    <span className="font-body">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {order.items.length > 0 && (
            <p className="font-body text-xs text-muted-foreground dark:text-muted mt-1">
              Total: {formatCurrency(order.total_amount)}
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-col items-end space-x-3">
          <OrderStatusBadge status={order.status} className="mb-2" />
          <div className="font-body text-xs text-muted-foreground dark:text-muted">
            {formatDate(order.created_at)}
          </div>
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="mt-2 space-x-2">
              {/* Status transition buttons */}
              {[['pending', 'confirmed'], ['confirmed', 'preparing'], ['preparing', 'out_for_delivery'], ['out_for_delivery', 'delivered']]
                .filter(([current]) => current === order.status)
                .map(([, next]) => (
                  <button
                    key={next}
                    onClick={() => handleStatusChange(next)}
                    className={`px-2 py-1 text-xs rounded bg-primary/10 hover:bg-primary/20 text-primary`}
                    disabled={false}
                  >
                    {next.charAt(0).toUpperCase() + next.slice(1)}
                  </button>
                ))}
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {order.items.length > 0 && (
        <div className="border-t border-border pt-3 mt-3">
          <p className="font-body text-xs text-muted-foreground dark:text-muted">
            Special Instructions:
          </p>
          {order.items.some(item => item.special_instructions) ? (
            <p className="font-body text-sm italic text-muted-foreground dark:text-muted mt-1">
              {order.items
                .filter(item => item.special_instructions)
                .map(item => `${item.name}: ${item.special_instructions}`)
                .join('\n')}
            </p>
          ) : (
            <p className="font-body text-sm text-muted-foreground dark:text-muted mt-1">
              None
            </p>
          )}
        </div>
      )}
    </div>
  );
};