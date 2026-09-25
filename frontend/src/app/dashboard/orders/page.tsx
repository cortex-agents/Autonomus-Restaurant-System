'use client'

import { useOrders } from "@/hooks/useOrders";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { OrderCard } from "@/components/ui/OrderCard";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon, CalendarDaysIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { Playfair_Display } from "next/font/google";
import { Inter } from "next/font/google";
import { HomeIcon } from "lucide-react";
import Link from "next/link";

const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function OrdersPage() {
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-pulse rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className={`${playfairDisplay.className} text-lg font-medium text-foreground dark:text-[#e2e8f0] mb-2`}>
              Loading orders...
            </p>
            <p className={`${inter.className} text-sm text-muted-foreground dark:text-muted`}>
              Fetching your latest orders from the kitchen
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="p-6 bg-red-50 border border-red-200 text-red-500 rounded-md dark:bg-red-50 dark:text-red-400 dark:border-red-300">
            <p className={`${inter.className} font-medium`}>
              Error loading orders: {error instanceof Error ? error.message : String(error)}
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => refetch()} className="px-4 py-2">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-border dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className={`${playfairDisplay.className} text-2xl font-bold text-foreground dark:text-[#e2e8f0]`}>
                Orders Management
              </h1>
              <p className={`${inter.className} mt-1 text-sm text-muted-foreground dark:text-muted`}>
                {total} total orders • {orders.length} shown
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter(null);
                  const params = new URLSearchParams(searchParams);
                  params.delete('status');
                  params.delete('page');
                  const newUrl = `/dashboard/orders${params.toString() ? `?${params.toString()}` : ''}`;
                  window.history.replaceState({}, '', newUrl);
                  refetch();
                }}
                className={statusFilter === null ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                All Orders
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  handleStatusFilterChange('pending');
                }}
                className={statusFilter === 'pending' ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                Pending
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  handleStatusFilterChange('confirmed');
                }}
                className={statusFilter === 'confirmed' ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                Confirmed
              </Button>

              <Button
                variant="default"
                onClick={() => refetch()}
                size="sm"
                className="hover:bg-accent/5"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                <span className={`${inter.className} text-sm`}>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className={`${inter.className} text-muted-foreground`}>
                {statusFilter ? `No ${statusFilter} orders` : "No orders yet"}
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="hover:bg-accent/5"
                >
                  Check for New Orders
                </Button>
                <Link href="/dashboard/menu" className="text-sm font-medium text-primary hover:text-primary/80">
                  Update Menu
                </Link>
              </div>
              {statusFilter === null && (
                <div className="mt-8 text-sm text-muted-foreground dark:text-muted dark:text-muted">
                  Orders appear here when customers place them through WhatsApp or other channels.
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Orders Summary Bar */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                  <div className="h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                    <ListBulletIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className={`${inter.className} text-sm font-medium text-muted-foreground dark:text-muted`}>
                      Total Revenue
                    </p>
                    <p className={`${playfairDisplay.className} text-lg font-bold text-foreground dark:text-[#e2e8f0]`}>
                      ₨{orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                    <HomeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className={`${inter.className} text-sm font-medium text-muted-foreground dark:text-muted`}>
                      Average Order Value
                    </p>
                    <p className={`${playfairDisplay.className} text-lg font-bold text-foreground dark:text-[#e2e8f0]`}>
                      ₨{(orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    className="hover:shadow-lg transition-shadow duration-300"
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {total > limit && (
                <div className="mt-8 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-border dark:border-[#334155]">
                  <div className={`${inter.className} text-sm text-muted-foreground dark:text-muted`}>
                    Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} orders
                  </div>
                  <div className="flex items-center space-x-2">
                    {page > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('page', String(page - 1));
                          const newUrl = `/dashboard/orders${params.toString() ? `?${params.toString()}` : ''}`;
                          window.history.replaceState({}, '', newUrl);
                          refetch();
                        }}
                        size="sm"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}
                    {page * limit < total && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('page', String(page + 1));
                          const newUrl = `/dashboard/orders${params.toString() ? `?${params.toString()}` : ''}`;
                          window.history.replaceState({}, '', newUrl);
                          refetch();
                        }}
                        size="sm"
                      >
                        Next
                        <ArrowPathIcon className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
