import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface EscalationListProps {
  escalations: {
    id: string;
    reason: string;
    status: "open" | "acknowledged" | "resolved";
    created_at: string;
    resolved_at: string | null;
  }[];
  onEscalationClick: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  isLoading: boolean;
}

export const EscalationList = ({
  escalations,
  onEscalationClick,
  onStatusChange,
  isLoading,
}: EscalationListProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading escalations...</p>
      </div>
    );
  }

  if (escalations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No escalations found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {escalations.map((esc) => (
        <div
          key={esc.id}
          className={`cursor-pointer border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow ${
            esc.status === "resolved" ? "opacity-75" : ""
          }`}
          onClick={() => onEscalationClick(esc.id)}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-foreground">
                Escalation #{esc.id.slice(0, 8)}
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                {esc.reason}
              </p>
              <div className="text-xs text-muted-foreground">
                Created: {formatDate(esc.created_at)}
                {esc.resolved_at && (
                  <span className="ml-3">
                    Resolved: {formatDate(esc.resolved_at)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Replace EscalationStatusBadge with inline badge */}
              <span className={`px-2 py-1 text-xs font-medium rounded-full
                ${esc.status === 'open' ? 'bg-red-100 text-red-800'
                : esc.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'}`}
              >
                {esc.status}
              </span>
              {esc.status !== "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newStatus =
                      esc.status === "open" ? "acknowledged" : "resolved";
                    onStatusChange(esc.id, newStatus);
                  }}
                >
                  {esc.status === "open" ? "Acknowledge" : "Resolve"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};