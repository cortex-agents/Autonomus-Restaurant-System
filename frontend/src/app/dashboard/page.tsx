'use client'

import { useOrders } from "@/hooks/useOrders";
import { useMenu } from "@/hooks/useMenu";
import { useSettings } from "@/hooks/useSettings";
import { useEscalations } from "@/hooks/useEscalations";
import Link from "next/link";
import {
  ListBulletIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency } from "@/lib/format";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: string;
  href: string;
}) {
  return (
    <Link href={href} className="card-surface hover-lift group block p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {hint}
        <ArrowRightIcon className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="page-container py-8">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card-surface h-36 animate-pulse bg-muted/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-surface h-72 animate-pulse bg-muted/60 lg:col-span-2" />
        <div className="card-surface h-72 animate-pulse bg-muted/60" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useOrders({ status: undefined, page: 1, limit: 100 }); // Get more orders for stats

  const {
    menuData: { categories: menuCategories, uncategorized },
    isLoading: menuLoading,
    error: menuError,
  } = useMenu();

  const { settings, isLoading: settingsLoading, error: settingsError } = useSettings();

  const {
    escalations,
    isLoading: escalationsLoading,
    error: escalationsError,
  } = useEscalations({ status: undefined });

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => order.created_at.startsWith(today));
  const pendingOrders = orders.filter(
    order => order.status === 'pending' || order.status === 'confirmed'
  );
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);

  const totalMenuItems =
    menuCategories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) +
    (uncategorized?.length || 0);
  const availableMenuItems =
    menuCategories.reduce(
      (sum, cat) => sum + (cat.items?.filter(item => item.is_available).length || 0),
      0
    ) + (uncategorized?.filter(item => item.is_available).length || 0);

  const openEscalations = escalations.filter(
    esc => esc.status === 'open' || esc.status === 'acknowledged'
  ).length;

  if (ordersLoading || menuLoading || settingsLoading || escalationsLoading) {
    return <Skeleton />;
  }

  const anyError = ordersError || menuError || settingsError || escalationsError;
  if (anyError) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center py-8">
        <div className="card-surface max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl">⚠️</div>
          <h2 className="mt-4 font-display text-xl font-semibold">We couldn&apos;t load your dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">{anyError.message || 'Unknown error'}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const recent = [...orders]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-container py-6 sm:py-8">
      {/* Header */}
      <header className="animate-fade-in-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{greeting}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            {settings.name ? settings.name : 'Dashboard Overview'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s how your restaurant is doing today · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Link
          href="/dashboard/orders?status=pending"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          <ListBulletIcon className="h-5 w-5" />
          View live orders
          {pendingOrders.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              {pendingOrders.length}
            </span>
          )}
        </Link>
      </header>

      {/* Stats */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's orders"
          value={todayOrders.length}
          hint="View all orders"
          icon={ListBulletIcon}
          tone="bg-primary/10 text-primary"
          href="/dashboard/orders"
        />
        <StatCard
          label="Today's revenue"
          value={formatCurrency(todayRevenue)}
          hint={`${pendingOrders.length} awaiting action`}
          icon={BanknotesIcon}
          tone="bg-success/10 text-success"
          href="/dashboard/orders"
        />
        <StatCard
          label="Menu items live"
          value={`${availableMenuItems}/${totalMenuItems}`}
          hint="Manage menu"
          icon={BookOpenIcon}
          tone="bg-accent/10 text-accent"
          href="/dashboard/menu"
        />
        <StatCard
          label="Open escalations"
          value={openEscalations}
          hint={openEscalations > 0 ? 'Guests are waiting for you' : 'All caught up'}
          icon={ChatBubbleLeftRightIcon}
          tone={openEscalations > 0 ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info'}
          href="/dashboard/escalations"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="card-surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl">🧾</div>
              <p className="mt-3 font-medium">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders appear here as customers place them through WhatsApp.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map(order => (
                <li key={order.id}>
                  <Link
                    href="/dashboard/orders"
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground">
                      #{order.id.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold tabular-nums sm:block">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Restaurant info + shortcuts */}
        <div className="space-y-6">
          <section className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Service details</h2>
              <Link href="/dashboard/settings" aria-label="Edit settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary">
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground"><ClockIcon className="h-4 w-4" /> Hours</dt>
                <dd className="font-medium">
                  {settings.opening_time && settings.closing_time
                    ? `${settings.opening_time} – ${settings.closing_time}`
                    : 'Not set'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Delivery radius</dt>
                <dd className="font-medium">
                  {settings.delivery_radius_km != null ? `${settings.delivery_radius_km} km` : 'Not set'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd className="font-medium">
                  {settings.delivery_fee != null ? formatCurrency(Number(settings.delivery_fee)) : 'Not set'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Minimum order</dt>
                <dd className="font-medium">
                  {settings.min_order_amount != null ? formatCurrency(Number(settings.min_order_amount)) : 'Not set'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(355_62%_26%)] to-[hsl(355_55%_16%)] p-5 text-white shadow-soft">
            <div className="pattern-dots absolute inset-0" aria-hidden />
            <div className="relative">
              <p className="eyebrow !text-accent">Quick tip</p>
              <p className="mt-2 font-display text-lg font-semibold">Sold out of something?</p>
              <p className="mt-1 text-sm text-white/70">
                Switch an item off in your menu and the AI stops offering it to customers immediately.
              </p>
              <Link
                href="/dashboard/menu"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3.5 text-sm font-medium ring-1 ring-white/20 transition-colors hover:bg-white/20"
              >
                Open menu <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
