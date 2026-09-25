'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setAuthData } from "@/lib/auth";
import { Playfair_Display } from "next/font/google";
import { Inter } from "next/font/google";

const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();

      // Store tokens in the format expected by auth.ts
      // Extract expiration from JWT token (exp is in seconds since epoch)
      let expiresAt = Math.floor(Date.now() / 1000) + 3600; // Default 1 hour from now
      try {
        const payload = data.access_token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const parsedPayload = JSON.parse(decodedPayload);
        if (parsedPayload.exp) {
          expiresAt = parsedPayload.exp;
        }
      } catch (e) {
        console.warn('Failed to parse expiration from token, using default:', e);
      }
      setAuthData({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      });

      // Redirect to dashboard
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-center">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 flex items-center justify-center bg-primary/10 dark:bg-primary/20 rounded-xl">
              <span className={`${playfairDisplay.className} text-2xl font-bold text-primary`}>🍽️</span>
            </div>
          </div>
          <div className="flex-1 text-center">
            <h1 className={`${playfairDisplay.className} text-2xl font-bold text-foreground dark:text-[#e2e8f0]`}>
              Restaurant Dashboard
            </h1>
            <p className={`${inter.className} mt-2 text-sm text-muted-foreground dark:text-muted`}>
              Manage your restaurant operations with AI-powered order taking
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className={`${inter.className} mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100`}>
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className={`${inter.className} mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100`}>
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-50 dark:text-red-400 border border-red-200 dark:border-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  Signing in...
                  <div className="ml-2 h-4 w-4 animate-pulse rounded-full bg-white dark:bg-gray-200"></div>
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className={`${inter.className} text-sm text-gray-500 dark:text-gray-400`}>
            © {new Date().getFullYear()} Restaurant OS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
