import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api-client";

export interface AnalyticsSummary {
  range_days: number;
  orders_count: number;
  revenue: number;
  avg_order_value: number;
  pending_orders: number;
  open_escalations: number;
  resolved_escalations: number;
  top_items: { name: string; qty: number }[];
}

export const useAnalytics = (days = 7) =>
  useQuery({
    queryKey: ["analytics", days],
    queryFn: () => fetcher<AnalyticsSummary>(`/analytics/summary?days=${days}`),
    refetchInterval: 60_000,
  });
