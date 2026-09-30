import {
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";

import {
  fetcher,
  postFetcher,
  patchFetcher,
  deleteFetcher,
} from "@/lib/api-client";

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  is_available: boolean;
  variants: Array<{
    name: string;
    price_delta: number;
  }>;
  addons: Array<{
    name: string;
    price: number;
  }>;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  items?: MenuItem[];
}

interface MenuResponse {
  categories: MenuCategory[];
  uncategorized: MenuItem[];
}

/**
 * Get complete restaurant menu.
 *
 * Backend already returns:
 * {
 *   categories: [...],
 *   uncategorized: [...]
 * }
 *
 * So there is no need to call /menu/categories separately.
 */
export const fetchMenu = async (): Promise<MenuResponse> => {
  return fetcher<MenuResponse>("/menu");
};

export const createMenuItem = async (
  item: Omit<MenuItem, "id">
): Promise<MenuItem> => {
  return postFetcher<MenuItem>("/menu/items", item);
};

export const updateMenuItem = async (
  id: string,
  item: Partial<MenuItem>
): Promise<MenuItem> => {
  return patchFetcher<MenuItem>(
    `/menu/items/${id}`,
    item
  );
};

export const deleteMenuItem = async (
  id: string
): Promise<void> => {
  await deleteFetcher<void>(
    `/menu/items/${id}`
  );
};

export const toggleItemAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<MenuItem> => {
  return patchFetcher<MenuItem>(
    `/menu/items/${id}/availability`,
    {
      is_available: isAvailable,
    }
  );
};

export const useMenu = () => {
  const queryClient = useQueryClient();

  const {
    data: menuData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: createMenuItem,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["menu"],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      item,
    }: {
      id: string;
      item: Partial<MenuItem>;
    }) => updateMenuItem(id, item),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["menu"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["menu"],
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      isAvailable,
    }: {
      id: string;
      isAvailable: boolean;
    }) =>
      toggleItemAvailability(
        id,
        isAvailable
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["menu"],
      });
    },
  });

  return {
    menuData:
      menuData || {
        categories: [],
        uncategorized: [],
      },

    // Categories already come from /menu.
    // Do NOT call a separate /menu/categories endpoint.
    categories: menuData?.categories || [],

    isLoading,
    error,
    refetch,

    createMenuItem: createMutation.mutate,
    isCreating: createMutation.isPending,

    updateMenuItem: updateMutation.mutate,
    isUpdating: updateMutation.isPending,

    deleteMenuItem: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,

    toggleItemAvailable: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
};

export const useMenuItem = (id: string) => {
  return useQuery({
    queryKey: ["menu-item", id],

    queryFn: () =>
      fetcher<MenuItem>(
        `/menu/items/${id}`
      ),

    enabled: !!id,
  });
};