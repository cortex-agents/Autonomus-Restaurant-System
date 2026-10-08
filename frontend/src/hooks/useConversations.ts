import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api-client";

export interface ConversationRow {
  id: string;
  customer_phone: string;
  status: string;
  order_stage: string | null;
  started_at: string;
  last_activity_at: string | null;
  escalated_reason: string | null;
}

export interface Transcript {
  id: string;
  status: string;
  order_stage: string | null;
  messages: { id: string; direction: "inbound" | "outbound"; role: string; content: string; created_at: string }[];
}

export const useConversations = (status?: string, page = 1) =>
  useQuery({
    queryKey: ["conversations", status ?? "all", page],
    queryFn: () =>
      fetcher<{ items: ConversationRow[]; page: number; page_size: number }>(
        `/conversations?page=${page}${status ? `&status=${status}` : ""}`
      ),
    refetchInterval: 20_000,
  });

export const useTranscript = (id: string | null) =>
  useQuery({
    queryKey: ["conversation", id],
    queryFn: () => fetcher<Transcript>(`/conversations/${id}`),
    enabled: !!id,
  });
