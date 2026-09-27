"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  cancelCampaign,
  getCampaign,
  listAudienceSegments,
  listCampaignMessages,
  listCampaigns,
  pauseCampaign,
  resumeCampaign,
} from "./services";
import type { CampaignAction, NotificationCampaign } from "./types";

/** Una campaña en curso cambia sola: se refresca mientras alguien la mira. */
const LIVE_REFRESH_MS = 30_000;

export function useCampaigns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.notificationCampaigns(query),
    queryFn: () => listCampaigns(query),
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.notificationCampaign(campaignId),
    queryFn: () => getCampaign(campaignId),
    enabled: Boolean(campaignId),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? LIVE_REFRESH_MS : false,
  });
}

export function useCampaignMessages(campaignId: string, query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.notificationCampaignMessages(campaignId, query),
    queryFn: () => listCampaignMessages(campaignId, query),
    enabled: Boolean(campaignId),
  });
}

export function useAudienceSegments(status: "active" | "archived") {
  return useQuery({
    queryKey: queryKeys.notificationSegments(status),
    queryFn: () => listAudienceSegments(status),
  });
}

export function useCampaignActionMutation(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: CampaignAction;
      reason?: string;
    }): Promise<NotificationCampaign> => {
      if (action === "pause") return pauseCampaign(campaignId);
      if (action === "resume") return resumeCampaign(campaignId);
      return cancelCampaign(campaignId, reason ?? "");
    },
    onSuccess: async (campaign) => {
      queryClient.setQueryData(
        queryKeys.notificationCampaign(campaignId),
        campaign,
      );
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "campaigns"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "campaign", campaignId, "messages"],
      });
    },
  });
}
