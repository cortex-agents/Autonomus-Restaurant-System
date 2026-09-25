import * as React from "react";
import { Message } from "@/components/ui/Message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

interface EscalationDetailProps {
  escalation: {
    id: string;
    reason: string;
    status: "open" | "acknowledged" | "resolved";
    created_at: string;
    resolved_at: string | null;
    messages: {
      id: string;
      direction: "inbound" | "outbound";
      role: "customer" | "agent" | "system";
      content: string;
      created_at: string;
    }[];
  };
  onReply: (content: string) => Promise<void>;
  onResolve: () => Promise<void>;
  isReplying: boolean;
  isResolving: boolean;
}

export const EscalationDetail = ({
  escalation,
  onReply,
  onResolve,
  isReplying,
  isResolving,
}: EscalationDetailProps) => {
  const [replyContent, setReplyContent] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      await onReply(replyContent.trim());
      setReplyContent("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Escalation Header */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Escalation Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {escalation.id.slice(0, 8)}...{escalation.id.slice(-4)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Replace EscalationStatusBadge with inline badge */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full
              ${escalation.status === 'open' ? 'bg-red-100 text-red-800'
              : escalation.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'}`}
            >
              {escalation.status}
            </span>
            {escalation.status !== "resolved" && (
              <Button
                variant="destructive"
                onClick={onResolve}
                disabled={isResolving}
                className={isResolving ? "opacity-50" : ""}
              >
                {isResolving ? "Resolving..." : "Resolve"}
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Reason for Escalation
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whs-pre-wrap">
            {escalation.reason}
          </p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Timeline
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created: {formatDate(escalation.created_at)}
            {escalation.resolved_at && (
              <>
                <br />
                Resolved: {formatDate(escalation.resolved_at)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Conversation Transcript */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Conversation Transcript
        </h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {escalation.messages.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No messages in conversation
            </p>
          ) : (
            <>
              {escalation.messages.map((msg) => (
                <Message key={msg.id} message={msg} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Reply Section */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Send Reply
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Response
            </label>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your response to the customer..."
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isReplying}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isReplying || !replyContent.trim()}
              className={isReplying ? "opacity-50" : ""}
            >
              {isReplying ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};