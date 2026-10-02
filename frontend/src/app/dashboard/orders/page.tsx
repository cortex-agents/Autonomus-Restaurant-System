'use client'

import { useOrders } from "@/hooks/useOrders";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { OrderCard } from "@/components/ui/OrderCard";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";


function OrdersContent() {
  const searchParams = useSearchParams();
  const {
    orders,
    total,
    page,
    limit,
    isLoading,
    error,
    refetch,
    updateOrderStatus,
    isUpdatingStatus
  } = useOrders({ 
    status: searchParams.get('status') || undefined, 
    page: Number(searchParams.get('page')) || 1, 
    limit: Number(searchParams.get('limit')) || 20 
  });

  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status') || null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Handle status change
  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatus({ id: orderId, status: newStatus as any });
  };

  // Handle refresh interval
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [refetch]);

  // Handle status change
  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    // Update URL without page reset
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
      params.delete('page'); // Reset to first page when filtering
    } else {
      params.delete('status');
    }
    const newUrl = `/dashboard/orders${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const TABS: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Preparing", value: "preparing" },
    { label: "Out for delivery", value: "out_for_delivery" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    window.history.replaceState({}, '', `/dashboard/orders?${params.toString()}`);
    refetch();
  };

  const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const average = orders.length ? revenue / orders.length : 0;

  if (isLoading) {
    return (
      <div className="page-container py-8">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-surface h-44 animate-pulse bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center py-8">
        <div className="card-surface max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl">⚠️</div>
          <h2 className="mt-4 font-display text-xl font-semibold">Couldn&apos;t load orders</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <Button onClick={() => refetch()} className="mt-6">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-6 sm:py-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Kitchen</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total · {orders.length} shown · updates every 30s
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </Button>
      </header>

      {/* Filter tabs */}
      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
          {TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => handleStatusFilterChange(tab.value)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card-surface mt-6 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">🧾</div>
          <p className="mt-4 font-display text-xl font-semibold">
            {statusFilter ? `No ${statusFilter.replace(/_/g, " ")} orders` : "No orders yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Orders appear here when customers place them through WhatsApp or other channels.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => refetch()}>Check for new orders</Button>
            <Link
              href="/dashboard/menu"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-primary hover:bg-primary/5"
            >
              Update menu
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card-surface flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-lg">💰</span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue (shown)</p>
                <p className="font-display text-2xl font-semibold tabular-nums">{formatCurrency(revenue)}</p>
              </div>
            </div>
            <div className="card-surface flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-lg">🧮</span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average order</p>
                <p className="font-display text-2xl font-semibold tabular-nums">{formatCurrency(average)}</p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <nav className="card-surface mt-8 flex flex-wrap items-center justify-between gap-3 px-4 py-3" aria-label="Pagination">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} orders
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  <ChevronLeftIcon className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => goToPage(page + 1)}>
                  Next <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  // useSearchParams() must sit under a Suspense boundary for `next build`
  return (
    <Suspense
      fallback={
        <div className="page-container py-8">
          <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
