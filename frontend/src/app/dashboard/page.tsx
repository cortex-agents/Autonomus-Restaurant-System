'use client'

import { useOrders } from "@/hooks/useOrders";
import { useMenu } from "@/hooks/useMenu";
import { useSettings } from "@/hooks/useSettings";
import { useEscalations } from "@/hooks/useEscalations";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ListBulletIcon, HomeIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const {
    orders,
    total,
    isLoading: ordersLoading,
    error: ordersError
  } = useOrders({ status: undefined, page: 1, limit: 100 }); // Get more orders for stats

  const {
    menuData: { categories: menuCategories, uncategorized },
    isLoading: menuLoading,
    error: menuError
  } = useMenu();

  const {
    settings,
    isLoading: settingsLoading,
    error: settingsError
  } = useSettings();

  const {
    escalations,
    isLoading: escalationsLoading,
    error: escalationsError
  } = useEscalations({ status: undefined });

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => 
    order.created_at.startsWith(today)
  );
  
  const pendingOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'confirmed'
  );
  
  const totalRevenue = orders.reduce((sum, order) => 
    sum + order.total_amount, 0
  );
  
  const todayRevenue = todayOrders.reduce((sum, order) => 
    sum + order.total_amount, 0
  );
  
  const totalMenuItems = menuCategories.reduce((sum, cat) => 
    sum + (cat.items?.length || 0), 0
  ) + (uncategorized?.length || 0);
  
  const availableMenuItems = menuCategories.reduce((sum, cat) => 
    sum + (cat.items?.filter(item => item.is_available).length || 0), 0
  ) + (uncategorized?.filter(item => item.is_available).length || 0);
  
  const openEscalations = escalations.filter(esc => 
    esc.status === 'open' || esc.status === 'acknowledged'
  ).length;

  if (ordersLoading || menuLoading || settingsLoading || escalationsLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex space-x-4">
          <div className="w-8 h-8 border-2 border-primary rounded-full flex items-center justify-center">
            <ListBulletIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Loading dashboard...
          </h2>
        </div>
      </div>
    );
  }

  if (ordersError || menuError || settingsError || escalationsError) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex space-x-4">
            <div className="w-8 h-8 border-2 border-red-500 rounded-full flex items-center justify-center">
              <ListBulletIcon className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Error loading dashboard
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {(ordersError || menuError || settingsError || escalationsError)?.message || 'Unknown error'}
          </p>
          <Link href="/" className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
            Try Again
          </Link>
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
              <h1 className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">
                Dashboard Overview
              </h1>
              <p className="mt-1 text-muted-foreground dark:text-muted">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                {settings.brand_voice?.split(' ')[0]?.toUpperCase() || 'R'}
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-medium text-foreground dark:text-[#e2e8f0]">
                  {settings.brand_voice?.split(' ')[0] || 'Your Restaurant'}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted">
                  {settings.timezone || 'Local Time'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto grid gap-6">
          {/* Today's Stats */}
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Today's Orders</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{todayOrders.length}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <ListBulletIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Today's Revenue</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">₨{todayRevenue.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Pending Orders</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{pendingOrders.length}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Open Escalations</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{openEscalations}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <Cog6ToothIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Total Orders</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{total}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <ListBulletIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Total Revenue</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">₨{totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted">Menu Items</p>
                  <p className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{totalMenuItems}</p>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-muted">
                    {availableMenuItems} available
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-xl font-bold text-foreground dark:text-[#e2e8f0] mb-6">
            Recent Activity
          </h2>
          
          <div className="space-y-6">
            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-border dark:border-[#334155]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-medium text-foreground dark:text-[#e2e8f0]">
                  Recent Orders
                </h3>
                <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:text-primary/80">
                  View All
                </Link>
              </div>
              
              {todayOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between py-3 border-t border-border dark:border-[#334155] first:border-t-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground dark:text-[#e2e8f0] truncate">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-muted">
                      {order.customer_name} • {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      order.status === 'preparing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      order.status === 'out_for_delivery' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {order.status}
                    </span>
                    <p className="font-medium text-foreground dark:text-[#e2e8f0]">₨{order.total_amount}</p>
                  </div>
                </div>
              ))}
              
              {todayOrders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No orders today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}