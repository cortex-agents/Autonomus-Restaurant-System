"use client";

import { getUserFromToken } from "@/lib/auth";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  HomeIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface User {
  restaurantId: string;
  email: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    const currentUser =
      getUserFromToken();

    setUser(currentUser);
    setMounted(true);

    if (
      !currentUser?.restaurantId ||
      !currentUser?.email
    ) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-background dark:bg-[#0a0a0a]">
      <aside className="hidden w-64 border-r border-border dark:border-[#334155] md:block">
        <div className="flex h-full flex-col p-4 space-y-6">

          {/* Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3"
            >
              <div className="h-10 w-10 flex items-center justify-center">
                <span className="font-display text-primary text-2xl">
                  🍽️
                </span>
              </div>

              <span className="font-display text-primary font-semibold text-xl">
                BistroBot
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-8 space-y-2 flex-1">

            <Link
              href="/dashboard/orders"
              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors duration-200"
            >
              <ListBulletIcon className="h-5 w-5" />
              Orders
            </Link>

            <Link
              href="/dashboard/menu"
              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors duration-200"
            >
              <HomeIcon className="h-5 w-5" />
              Menu
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors duration-200"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Settings
            </Link>

            <Link
              href="/dashboard/escalations"
              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors duration-200"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Escalations
            </Link>
          </nav>

          {/* User section */}
          <div className="mt-auto border-t border-border dark:border-[#334155] pt-4">
            <div className="flex items-center space-x-3">

              {/* Avatar */}
              <div className="h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center">
                {mounted
                  ? user?.email?.[0]?.toUpperCase() || "?"
                  : ""}
              </div>

              <div className="space-y-1 min-w-0">

                <p className="font-display text-sm font-medium text-foreground dark:text-[#e2e8f0] truncate">
                  {mounted
                    ? user?.email?.split("@")[0] ||
                      "User"
                    : ""}
                </p>

                <p className="text-xs text-muted-foreground dark:text-muted truncate">
                  {mounted &&
                  user?.restaurantId
                    ? `Restaurant #${user.restaurantId}`
                    : ""}
                </p>

              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* Main content */}
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