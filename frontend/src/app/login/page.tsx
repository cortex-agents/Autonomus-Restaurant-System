'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setAuthData } from "@/lib/auth";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call login API
      const response = await fetch("http://localhost:8000/api/auth/login", {
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
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand / pitch panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[hsl(355_62%_24%)] via-[hsl(355_58%_18%)] to-[hsl(20_30%_10%)] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pattern-dots absolute inset-0" aria-hidden />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary/40 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-2xl ring-1 ring-accent/40">🍽️</span>
          <span className="font-display text-2xl font-semibold">BistroBot</span>
        </div>

        <div className="relative max-w-lg animate-fade-in-up">
          <p className="eyebrow !text-accent">Your digital front-of-house</p>
          <h2 className="mt-4 font-display text-5xl font-semibold leading-[1.1]">
            Every WhatsApp message,<br />
            <span className="text-accent">a confirmed order.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            An AI team member that takes orders around the clock, so your staff can focus on the food and your guests.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              ["💬", "WhatsApp ordering", "Customers order in plain language, in their own words."],
              ["⚡", "Live order board", "New orders appear instantly and move through your kitchen."],
              ["🤝", "Human hand-off", "Tricky requests are escalated to you with the full chat."],
            ].map(([icon, title, desc]) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg ring-1 ring-white/15">{icon}</span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-white/60">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} BistroBot · Built by Cortex Agents</p>
      </aside>

      {/* Sign-in panel */}
      <main className="flex items-center justify-center bg-background px-5 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-2xl">🍽️</span>
            <span className="font-display text-2xl font-semibold text-primary">BistroBot</span>
          </div>

          <p className="eyebrow">Owner portal</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to manage today&apos;s orders, menu and guests.</p>

          <form onSubmit={handleSubmit} className="card-surface mt-8 space-y-5 p-6 sm:p-8">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-muted-foreground hover:text-primary"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                <span aria-hidden>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need help getting started? Contact your Cortex Agents account manager.
          </p>
        </div>
      </main>
    </div>
  );
}
