import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetcher, patchFetcher } from "@/lib/api-client";

interface Settings {
  name?: string;
  opening_time: string | null;
  closing_time: string | null;
  delivery_radius_km: number | null;
  delivery_fee: number | null;
  min_order_amount: number | null;
  brand_voice: string | null;
  timezone: string | null;
}

export const fetchSettings = async (): Promise<Settings> => {
  // api-client already adds /api to the URL.
  // Therefore this must be /settings, NOT /api/settings.
  return fetcher<Settings>("/settings");
};

export const updateSettings = async (
  settings: Partial<Settings>
): Promise<Settings> => {
  return patchFetcher<Settings>("/settings", settings);
};

export const useSettings = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings"],
      });
    },
  });

  return {
    settings:
      data || {
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