"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Squares2X2Icon,
  ListBulletIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getUserFromToken, logout } from "@/lib/auth";

interface User {
  restaurantId: string;
  email: string;
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Squares2X2Icon, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ListBulletIcon },
  { href: "/dashboard/menu", label: "Menu", icon: BookOpenIcon },
  { href: "/dashboard/escalations", label: "Escalations", icon: ChatBubbleLeftRightIcon },
  { href: "/dashboard/settings", label: "Settings", icon: Cog6ToothIcon },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl ring-1 ring-accent/30">
        🍽️
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold text-white">BistroBot</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
          Restaurant OS
        </span>
      </span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const currentUser = getUserFromToken();
    setUser(currentUser);
    setMounted(true);
    if (!currentUser?.restaurantId || !currentUser?.email) {
      router.push("/login");
    }
  }, [router]);

  // close the mobile drawer on navigation
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    logout();
    queryClient.clear(); // never keep one restaurant's data around for the next login
    router.push("/login");
  };

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-accent" : "text-white/50 group-hover:text-white/80"}`} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-sm font-semibold text-accent">
            {mounted ? user?.email?.[0]?.toUpperCase() || "?" : ""}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {mounted ? user?.email?.split("@")[0] || "User" : ""}
            </p>
            <p className="truncate text-xs text-white/50">
              {mounted && user?.restaurantId ? `Restaurant #${user.restaurantId.slice(0, 8)}` : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-gradient-to-b from-[hsl(355_62%_22%)] to-[hsl(355_55%_14%)] md:block">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-gradient-to-b from-[hsl(355_62%_22%)] to-[hsl(355_55%_14%)] shadow-lift animate-fade-in">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-md p-2 text-white/70 hover:bg-white/10"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-foreground hover:bg-muted"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="font-display text-lg font-semibold text-primary">BistroBot</span>
          <span className="h-10 w-10" aria-hidden />
        </header>

        <main className="flex-1 overflow-x-hidden">
          {mounted && user ? (
            children
          ) : (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
