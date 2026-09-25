import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetcher, postFetcher, patchFetcher, deleteFetcher } from "@/lib/api-client";

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  is_available: boolean;
  variants: Array<{ name: string; price_delta: number }>;
  addons: Array<{ name: string; price: number }>;
  created_at: string;
}

interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

// Fetch menu categories and items
export const fetchMenu = async () => {
  const [categoriesResponse, itemsResponse] = await Promise.all([
    fetcher<MenuCategory[]>("/menu"), // This endpoint returns categories with items
    // Actually, based on backend API, /menu returns both categories and items
    fetcher<{ categories: any[]; uncategorized: any[] }>("/menu")
  ]);

  // The backend /menu endpoint already returns structured data
  return itemsResponse;
};

// Fetch categories only (for dropdowns)
export const fetchCategories = async (): Promise<MenuCategory[]> => {
  return fetcher<MenuCategory[]>("/menu/categories"); // Assuming this endpoint exists
};

// Create new menu item
export const createMenuItem = async (item: Omit<MenuItem, "id" | "created_at">): Promise<MenuItem> => {
  return postFetcher<MenuItem>("/menu/items", item);
};

// Update menu item
export const updateMenuItem = async (id: string, item: Partial<MenuItem>): Promise<MenuItem> => {
  return patchFetcher<MenuItem>(`/menu/items/${id}`, item);
};

// Delete menu item
export const deleteMenuItem = async (id: string): Promise<void> => {
  await deleteFetcher<void>(`/menu/items/${id}`);
};

// Toggle item availability
export const toggleItemAvailability = async (id: string, isAvailable: boolean): Promise<MenuItem> => {
  return patchFetcher<MenuItem>(`/menu/items/${id}/availability`, { is_available: isAvailable });
};

export const useMenu = () => {
  const queryClient = useQueryClient();

  // Menu query
  const { data: menuData, isLoading, error, refetch } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // garbageCollectionTime: 1000 * 60 * 30, // 30 minutes - removed due to type error
  });

  // Categories query (for dropdowns)
  const { data: categories = [], isLoading: catLoading, error: catError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes,
  });

  // Mutation for creating menu item
  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // Mutation for updating menu item
  const updateMutation = useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<MenuItem> }) =>
      updateMenuItem(id, item),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Also invalidate specific item query if we had one
      queryClient.invalidateQueries({ queryKey: ["menu-item", id] });
    },
  });

  // Mutation for deleting menu item
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // Mutation for toggling availability
  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      toggleItemAvailability(id, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return {
    // Menu data structure: { categories: [{ id, name, display_order, items: [] }], uncategorized: [] }
    menuData: menuData || { categories: [], uncategorized: [] },
    categories,
    isLoading: isLoading || catLoading,
    error: error || catError,
    refetch,
    // Mutations
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

// Individual menu item query (for editing)
export const useMenuItem = (id: string) => {
  return useQuery({
    queryKey: ["menu-item", id],
    queryFn: () => fetcher<MenuItem>(`/menu/items/${id}`),
    enabled: !!id,
  });
};