'use client'

import { useState } from "react";
import { useEscalations } from "@/hooks/useEscalations";
import { EscalationList } from "@/components/ui/EscalationList";
import { EscalationDetail } from "@/components/ui/EscalationDetail";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "lucide-react";


export default function EscalationsPage() {
  const {
    escalations,
    isLoading,
    error,
    refetch,
    postReply,
    isReplying,
    resolveEscalation,
    isResolving
  } = useEscalations({ status: undefined }); // Fetch all escalations initially

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const [selectedEscalation, setSelectedEscalation] = useState<any | null>(null);

  // Handle status filter change
  const handleFilterChange = (status: string | null) => {
    setStatusFilter(status);
    setSelectedEscalationId(null);
    setSelectedEscalation(null);
  };

  // Handle escalation selection
  const handleEscalationSelect = async (id: string) => {
    setSelectedEscalationId(id);
    // In a real implementation, we'd fetch the detailed escalation here
    // For now, we'll find it in the existing list (in a real app, use useEscalationDetail hook)
    const escalation = (escalations as any[]).find((e: any) => e.id === id);
    if (escalation) {
      setSelectedEscalation(escalation);
    }
  };

  // Handle reply submission
  const handleReply = async (content: string) => {
    if (selectedEscalationId) {
      try {
        await postReply({ id: selectedEscalationId, content });
        // Clear reply and refetch to show updated conversation
        setSelectedEscalation(null);
        setSelectedEscalationId(null);
        await refetch();
      } catch (err) {
        console.error("Failed to send reply:", err);
        // Error would be shown via UI in a real implementation
      }
    }
  };

  // Handle escalation resolution
  const handleResolve = async () => {
    if (selectedEscalationId) {
      try {
        await resolveEscalation(selectedEscalationId);
        setSelectedEscalation(null);
        setSelectedEscalationId(null);
        await refetch();
      } catch (err) {
        console.error("Failed to resolve escalation:", err);
        // Error would be shown via UI in a real implementation
      }
    }
  };

  // Filter escalations based on status
  const filteredEscalations = statusFilter
    ? (escalations as any[]).filter((esc: any) => esc.status === statusFilter)
    : (escalations as any[]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mb-4"></div>
            <p className="font-display text-lg font-medium text-foreground mb-2">
              Loading escalations...
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Fetching conversations requiring your attention
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
              Error loading escalations: {error instanceof Error ? error.message : String(error)}
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
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Escalations Management
              </h1>
              <p className="font-body mt-1 text-sm text-muted-foreground">
                {filteredEscalations.length} conversations requiring attention
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => handleFilterChange(null)}
                className={statusFilter === null ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                All
              </Button>

              <Button
                variant="outline"
                onClick={() => handleFilterChange("open")}
                className={statusFilter === "open" ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                Open
              </Button>

              <Button
                variant="outline"
                onClick={() => handleFilterChange("acknowledged")}
                className={statusFilter === "acknowledged" ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                Acknowledged
              </Button>

              <Button
                variant="outline"
                onClick={() => handleFilterChange("resolved")}
                className={statusFilter === "resolved" ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                Resolved
              </Button>

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
      </div>

      {/* Stats */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Total
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {escalations.length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <ListBulletIcon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-4 shadow-sm border border-">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Open
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {filteredEscalations.filter(e => e.status === 'open').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Acknowledged
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {filteredEscalations.filter(e => e.status === 'acknowledged').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <Cog6ToothIcon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Resolved
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {filteredEscalations.filter(e => e.status === 'resolved').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <CheckIcon className="h-4 w-4 text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {selectedEscalationId ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedEscalationId(null);
                    setSelectedEscalation(null);
                  }}
                  className="text-sm"
                >
                  ← Back to List
                </Button>
                <Button
                  variant="default"
                  onClick={handleResolve}
                  disabled={isResolving}
                  className={isResolving ? "opacity-50" : ""}
                >
                  {isResolving ? "Resolving..." : "Resolve Escalation"}
                </Button>
              </div>

              {selectedEscalation && (
                <EscalationDetail
                  escalation={selectedEscalation}
                  onReply={handleReply}
                  onResolve={handleResolve}
                  isReplying={isReplying}
                  isResolving={isResolving}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEscalations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-body text-muted-foreground">
                    {statusFilter ? `No ${statusFilter} escalations` : "No escalations yet"}
                  </p>
                  <p className="font-body text-sm text-muted-foreground mt-2">
                    Escalations are created automatically by the AI agent when it encounters
                    situations requiring human intervention.
                  </p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <EscalationList
                    escalations={filteredEscalations}
                    onEscalationClick={handleEscalationSelect}
                    onStatusChange={async (id, status) => {
                      // Direct status change without opening detail view
                      if (status === "resolved") {
                        await resolveEscalation(id);
                      } else if (status === "acknowledged") {
                        // In a real implementation, we might have a specific acknowledge endpoint
                        // For now, we'll treat it as resolving or just update status
                        await resolveEscalation(id); // Simplified
                      }
                      await refetch();
                    }}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
