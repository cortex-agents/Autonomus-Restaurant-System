import * as React from "react";
import { formatCurrency } from "@/lib/format";
import {
  OrderStatusBadge,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "./OrderStatusBadge";

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
    status: OrderStatus;
    created_at: string;
    updated_at: string;
  };
  onStatusChange?: (id: string, status: string) => void;
  className?: string;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  preparing: "Start preparing",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark delivered",
};

const ACCENT_BAR: Record<OrderStatus, string> = {
  pending: "bg-warning",
  confirmed: "bg-info",
  preparing: "bg-accent",
  out_for_delivery: "bg-primary",
  delivered: "bg-success",
  cancelled: "bg-destructive",
};

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const OrderCard = ({ order, onStatusChange, className = "" }: OrderCardProps) => {
  const next = NEXT_STATUS[order.status];
  const isClosed = order.status === "delivered" || order.status === "cancelled";
  const notes = order.items.filter((i) => i.special_instructions);

  return (
    <article
      className={`card-surface relative overflow-hidden transition-shadow hover:shadow-lift ${className}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${ACCENT_BAR[order.status]}`} aria-hidden />

      <div className="p-5 pl-7">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Order #{order.id.slice(0, 8)}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {order.customer_name}
              {order.customer_phone ? ` · ${order.customer_phone}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <OrderStatusBadge status={order.status} />
            <span className="text-xs text-muted-foreground">{formatTime(order.created_at)}</span>
          </div>
        </div>

        {/* Items */}
        {order.items.length > 0 && (
          <div className="mt-4 rounded-lg bg-muted/60 p-3">
            <ul className="divide-y divide-border/70 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                  <span className="text-foreground">
                    <span className="mr-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-primary/10 px-1 text-xs font-semibold text-primary">
                      {item.quantity}×
                    </span>
                    {item.name}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="font-display text-lg font-bold tabular-nums text-primary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        )}

        {/* Special instructions */}
        {notes.length > 0 && (
          <div className="mt-3 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Special instructions
            </p>
            <ul className="mt-1 space-y-0.5 text-foreground/80">
              {notes.map((i) => (
                <li key={i.id}>
                  <span className="font-medium">{i.name}:</span> {i.special_instructions}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {!isClosed && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => onStatusChange?.(order.id, "cancelled")}
              className="rounded-lg border border-destructive/30 px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Cancel
            </button>
            {next && (
              <button
                onClick={() => onStatusChange?.(order.id, next)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
              >
                {NEXT_ACTION[next] ?? ORDER_STATUS_LABELS[next]}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
