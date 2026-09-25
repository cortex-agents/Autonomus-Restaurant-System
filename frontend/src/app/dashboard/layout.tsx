'use client'

import { getUserFromToken } from "@/lib/auth";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HomeIcon } from "@heroicons/react/24/outline";
import { ListBulletIcon } from "@heroicons/react/24/outline";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { restaurantId, email } = getUserFromToken() || {};
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!restaurantId || !email) {
      router.push("/login");
    }
  }, [restaurantId, email, router]);

  return (
    <div className="flex h-screen bg-background dark:bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-border dark:border-[#334155] md:block">
        <div className="flex h-full flex-col p-4 space-y-6">
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="h-10 w-10 flex items-center justify-center">
                {/* Logo placeholder using Playfair Display */}
                <span className="font-display text-primary text-2xl">🍽️</span>
              </div>
              <span className="font-display text-primary font-semibold text-xl">
                BistroBot
              </span>
            </Link>
          </div>

          <nav className="mt-8 space-y-2 flex-1">
            <Link
              href="/dashboard/orders"
              className={`
                flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium
                text-foreground hover:bg-accent/5 dark:hover:bg-accent/10
                transition-colors duration-200
                `}
            >
              <ListBulletIcon className="h-5 w-5 flex items-center justify-center" />
              Orders
            </Link>

            <Link
              href="/dashboard/menu"
              className={`
                flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium
                text-foreground hover:bg-accent/5 dark:hover:bg-accent/10
                transition-colors duration-200
                `}
            >
              <HomeIcon className="h-5 w-5 flex items-center justify-center" />
              Menu
            </Link>

            <Link
              href="/dashboard/settings"
              className={`
                flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium
                text-foreground hover:bg-accent/5 dark:hover:bg-accent/10
                transition-colors duration-200
                `}
            >
              <Cog6ToothIcon className="h-5 w-5 flex items-center justify-center" />
              Settings
            </Link>

            <Link
              href="/dashboard/escalations"
              className={`
                flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium
                text-foreground hover:bg-accent/5 dark:hover:bg-accent/10
                transition-colors duration-200
                `}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 flex items-center justify-center" />
              Escalations
            </Link>
          </nav>

          <div className="mt-auto border-t border-border dark:border-[#334155] pt-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                {/* User icon placeholder */}
                {email?.[0]?.toUpperCase()}
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-medium text-foreground dark:text-[#e2e8f0]">
                  {email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted">
                  {restaurantId ? `Restaurant #${restaurantId}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold text-foreground dark:text-[#e2e8f0]">
            Dashboard
          </h1>
        </div>

        {children}
      </main>
    </div>
  );
}