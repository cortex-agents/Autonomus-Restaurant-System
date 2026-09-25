'use client'

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { SettingsForm } from "@/components/ui/SettingsForm";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Playfair_Display } from "next/font/google";
import { Inter } from "next/font/google";

const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function SettingsPage() {
  const {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings,
    isUpdating
  } = useSettings();

  // Fetch restaurant name from settings or use a default
  // In a real implementation, this might come from a separate endpoint or be part of the user's profile/JWT
  // For now, we'll use the first word of brand_voice or a fallback

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-pulse rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="${playfairDisplay.className} text-lg font-medium text-foreground dark:text-[#e2e8f0] mb-2">
              Loading settings...
            </p>
            <p className="${inter.className} text-sm text-muted-foreground dark:text-muted">
              Fetching your restaurant's configuration
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
            <p className="${inter.className} font-medium">
              Error loading settings: {error instanceof Error ? error.message : String(error)}
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

  // Extract restaurant name from settings or use placeholder
  // In a real app, this would come from the restaurant profile or JWT
  const displayName = settings.brand_voice?.split(' ')[0] || "Your Restaurant";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-border dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="${playfairDisplay.className} text-2xl font-bold text-foreground dark:text-[#e2e8f0]">
                Restaurant Settings
              </h1>
              <p className="${inter.className} mt-1 text-sm text-muted-foreground dark:text-muted">
                Configure your restaurant's operations and appearance
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => refetch()}
              size="sm"
              className="hover:bg-accent/5"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              <span className="${inter.className}">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <SettingsForm
            settings={settings}
            onChange={(field, value) => {
              // Create a partial settings object with only the changed field
              const updates: any = {};
              updates[field] = value;
              updateSettings(updates);
            }}
            isUpdating={isUpdating}
            restaurantName={displayName}
          />
        </div>
      </div>
    </div>
  );
}
