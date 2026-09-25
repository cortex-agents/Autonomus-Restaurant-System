import * as React from "react";
import { formatCurrency } from "@/lib/format";

interface MessageProps {
  message: {
    id: string;
    direction: "inbound" | "outbound";
    role: "customer" | "agent" | "system";
    content: string;
    created_at: string; // ISO timestamp
  };
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getMessageVariants = (direction: MessageProps['message']['direction']) => {
  return direction === "inbound"
    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
    : "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800";
};

const getMessageAlignment = (direction: MessageProps['message']['direction']) => {
  return direction === "inbound" ? "mr-auto" : "ml-auto";
};

export const Message = ({ message }: MessageProps) => {
  return (
    <div className={`max-w-xs mx-4 my-2 p-3 rounded-lg ${getMessageVariants(message.direction)} ${getMessageAlignment(message.direction)}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {/* Avatar or icon based on role */}
          {message.role === "customer" && (
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              C
            </div>
          )}
          {message.role === "agent" && (
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
              A
            </div>
          )}
          {message.role === "system" && (
            <div className="h-8 w-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm">
              ⚙
            </div>
          )}
        </div>
        <div className="ml-3 flex-1 space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium">
              {message.role === "customer" ? "Customer" :
               message.role === "agent" ? "Agent" :
               "System"}
            </span>
            <span>{formatDate(message.created_at)}</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whs-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
};