import {
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";

import {
  fetcher,
  patchFetcher,
} from "@/lib/api-client";

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

  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";

  created_at: string;
  updated_at: string;
}

interface BackendOrder {
  id: string;

  items: any[];

  subtotal: number;
  delivery_fee: number;
  total: number;

  delivery_address: string;
  payment_method: string;

  status: Order["status"];

  created_at: string;
}

interface BackendOrdersResponse {
  items: BackendOrder[];

  page: number;

  page_size: number;

  total: number;
}

/**
 * Convert backend order format into the format
 * expected by the dashboard UI.
 */
const normalizeOrder = (
  order: BackendOrder
): Order => {
  return {
    id: order.id,

    // Current backend order response does not
    // contain customer information directly.
    // Keep safe fallback values for the UI.
    customer_name: "Customer",
    customer_phone: "",

    items: (order.items || []).map(
      (item: any, index: number) => {
        const quantity = Number(
          item.qty ??
            item.quantity ??
            1
        );

        const price = Number(
          item.price ??
            item.base_price ??
            0
        );

        return {
          id: String(
            item.item_id ??
              item.id ??
              index
          ),

          name: String(
            item.name ??
              "Item"
          ),

          quantity,

          price,

          total: Number(
            item.total ??
              price * quantity
          ),

          special_instructions:
            item.special_instructions ??
            null,
        };
      }
    ),

    total_amount: Number(
      order.total
    ),

    status: order.status,

    created_at: order.created_at,

    // Backend Order model currently exposes
    // created_at but not updated_at.
    updated_at: order.created_at,
  };
};

export const fetchOrders = async (
  params?: {
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const queryParams =
    new URLSearchParams();

  if (params?.status) {
    queryParams.append(
      "status",
      params.status
    );
  }

  if (params?.page) {
    queryParams.append(
      "page",
      String(params.page)
    );
  }

  if (params?.limit) {
    queryParams.append(
      "page_size",
      String(params.limit)
    );
  }

  const queryString =
    queryParams.toString();

  const endpoint = queryString
    ? `/orders?${queryString}`
    : "/orders";

  const response =
    await fetcher<BackendOrdersResponse>(
      endpoint
    );

  return {
    orders: response.items.map(
      normalizeOrder
    ),

    total: response.total,

    page: response.page,

    limit: response.page_size,
  };
};

export const fetchOrder = async (
  id: string
) => {
  const response =
    await fetcher<BackendOrder>(
      `/orders/${id}`
    );

  return normalizeOrder(
    response
  );
};

export const updateOrderStatus = async (
  id: string,
  status: Order["status"]
): Promise<Order> => {
  const response =
    await patchFetcher<BackendOrder>(
      `/orders/${id}/status`,
      {
        status,
      }
    );

  return normalizeOrder(
    response
  );
};

export const useOrders = (
  filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const queryClient =
    useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "orders",
      filters,
    ],

    queryFn: () =>
      fetchOrders(filters),

    staleTime: 1000 * 30,
  });

  const updateStatusMutation =
    useMutation({
      mutationFn: ({
        id,
        status,
      }: {
        id: string;
        status: Order["status"];
      }) =>
        updateOrderStatus(
          id,
          status
        ),

      onSuccess: (
        _data,
        { id }
      ) => {
        queryClient.invalidateQueries(
          {
            queryKey: [
              "order",
              id,
            ],
          }
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "orders",
            ],
          }
        );
      },
    });

  return {
    orders:
      data?.orders || [],

    total:
      data?.total || 0,

    page:
      data?.page || 1,

    limit:
      data?.limit || 20,

    isLoading,

    error,

    refetch,

    updateOrderStatus:
      updateStatusMutation.mutate,

    isUpdatingStatus:
      updateStatusMutation.isPending,
  };
};

export const useOrder = (
  id: string
) => {
  return useQuery({
    queryKey: [
      "order",
      id,
    ],

    queryFn: () =>
      fetchOrder(id),

    enabled: !!id,
  });
};