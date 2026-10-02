'use client'

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { SettingsForm } from "@/components/ui/SettingsForm";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon } from "@heroicons/react/24/outline";


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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mb-4"></div>
            <p className="font-display text-lg font-medium text-foreground mb-2">
              Loading settings...
            </p>
            <p className="font-body text-sm text-muted-foreground">
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
          <div className="p-6 bg-destructive/5 border border-destructive/25 text-destructive rounded-xl">
            <p className="font-body font-medium">
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
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Restaurant Settings
              </h1>
              <p className="font-body mt-1 text-sm text-muted-foreground">
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
              <span className="font-body">Refresh</span>
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
