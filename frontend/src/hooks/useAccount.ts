import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api-client";

export interface Me {
  id: string;
  name: string;
  whatsapp_number: string | null;
  phone_number_id: string | null;
  timezone: string;
  owner_whatsapp_number?: string | null;
  owner_email: string | null;
}

export interface WhatsAppStatus {
  active_channel: string;
  restaurant_name: string;
  whatsapp_number: string | null;
  phone_number_id: string | null;
  last_inbound_message_at: string | null;
}

/** Identity of the logged-in restaurant (name + its WhatsApp number). */
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => fetcher<Me>("/auth/me"), staleTime: 1000 * 60 * 10 });

export const useWhatsAppStatus = () =>
  useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => fetcher<WhatsAppStatus>("/whatsapp/status"),
    refetchInterval: 30_000,
  });
