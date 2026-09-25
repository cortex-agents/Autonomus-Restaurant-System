import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetcher, postFetcher, patchFetcher, deleteFetcher } from "@/lib/api-client";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  special_instructions?: string | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Fetch orders list
export const fetchOrders = async (params?: { status?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/orders?${queryString}` : '/orders';
  return fetcher<{ orders: Order[]; total: number; page: number; limit: number }>(endpoint);
};

// Fetch single order
export const fetchOrder = async (id: string) => {
  return fetcher<Order>(`/orders/${id}`);
};

// Update order status
export const updateOrderStatus = async (id: string, status: Order['status']): Promise<Order> => {
  return patchFetcher<Order>(`/orders/${id}/status`, { status });
};

export const useOrders = (filters?: { status?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  // Orders query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 1000 * 30, // 30 seconds for live updates
    // garbageCollectionTime: 1000 * 60 * 5, // 5 minutes - removed due to type error
  });

  // Mutation for updating order status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      updateOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      // Invalidate the specific order and orders list
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders', filters] });
    },
  });

  return {
    orders: data?.orders || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    isLoading,
    error,
    refetch,
    updateOrderStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};

// Individual order query (for detailed view)
export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });
};