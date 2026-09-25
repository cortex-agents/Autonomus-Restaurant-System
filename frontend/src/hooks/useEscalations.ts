import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetcher, postFetcher, patchFetcher, deleteFetcher } from "@/lib/api-client";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  role: "customer" | "agent" | "system";
  content: string;
  created_at: string; // ISO timestamp
}

interface Escalation {
  id: string;
  reason: string;
  status: "open" | "acknowledged" | "resolved";
  created_at: string; // ISO timestamp
  resolved_at: string | null; // ISO timestamp or null
  messages: Message[];
}

// Fetch escalations list
export const fetchEscalations = async (params?: { status?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/escalations?${queryString}` : '/escalations';
  return fetcher<Escalation[]>(endpoint);
};

// Fetch single escalation detail
export const fetchEscalationDetail = async (id: string) => {
  return fetcher<Escalation>(`/escalations/${id}`);
};

// Post a reply to an escalation
export const postEscalationReply = async (id: string, content: string) => {
  return postFetcher<{ ok: true }>(`/escalations/${id}/reply`, { content });
};

// Resolve an escalation
export const resolveEscalation = async (id: string) => {
  return patchFetcher<{ ok: true; status: string; resolved_at: string }>(`/escalations/${id}/resolve`, {});
};

export const useEscalations = (filters?: { status?: string }) => {
  const queryClient = useQueryClient();

  // Escalations list query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['escalations', filters],
    queryFn: () => fetchEscalations(filters),
    staleTime: 1000 * 30, // 30 seconds for relatively fresh data
    // garbageCollectionTime: 1000 * 60 * 5, // 5 minutes - removed due to type error
  });

  // Mutation for posting a reply
  const postReplyMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      postEscalationReply(id, content),
    onSuccess: (_, { id }) => {
      // Invalidate the specific escalation and escalations list
      queryClient.invalidateQueries({ queryKey: ['escalation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['escalations', filters] });
    },
  });

  // Mutation for resolving an escalation
  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveEscalation(id),
    onSuccess: (_, id) => {
      // Invalidate the specific escalation and escalations list
      queryClient.invalidateQueries({ queryKey: ['escalation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['escalations', filters] });
    },
  });

  return {
    escalations: data || [],
    isLoading,
    error,
    refetch,
    postReply: postReplyMutation.mutate,
    isReplying: postReplyMutation.isPending,
    resolveEscalation: resolveMutation.mutate,
    isResolving: resolveMutation.isPending,
  };
};

// Individual escalation query (for detailed view)
export const useEscalationDetail = (id: string) => {
  return useQuery({
    queryKey: ['escalation-detail', id],
    queryFn: () => fetchEscalationDetail(id),
    enabled: !!id,
  });
};