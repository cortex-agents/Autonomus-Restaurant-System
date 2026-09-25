import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetcher, postFetcher, patchFetcher, deleteFetcher } from "@/lib/api-client";

interface Settings {
  opening_time: string | null; // Format: "HH:MM"
  closing_time: string | null; // Format: "HH:MM"
  delivery_radius_km: number | null;
  delivery_fee: number | null;
  min_order_amount: number | null;
  brand_voice: string | null;
  timezone: string | null;
}

// Fetch settings
export const fetchSettings = async (): Promise<Settings> => {
  return fetcher<Settings>("/api/settings");
};

// Update settings
export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  return patchFetcher<Settings>("/api/settings", settings);
};

export const useSettings = () => {
  const queryClient = useQueryClient();

  // Settings query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // garbageCollectionTime: 1000 * 60 * 30, // 30 minutes - removed due to type error
  });

  // Mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      // Invalidate settings query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  return {
    settings: data || {
      opening_time: null,
      closing_time: null,
      delivery_radius_km: null,
      delivery_fee: null,
      min_order_amount: null,
      brand_voice: null,
      timezone: null,
    },
    isLoading,
    error,
    refetch,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
};