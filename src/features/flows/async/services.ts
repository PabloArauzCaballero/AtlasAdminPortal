import { apiRequest } from "@/shared/api/client";
import type { PendingWorkResponse, RbacDriftResponse } from "./types";

export function getPendingWork(windowDays: number) {
  return apiRequest<PendingWorkResponse>("/systems/flows/pending-work", {
    query: { windowDays },
  });
}

export function getRbacDrift() {
  return apiRequest<RbacDriftResponse>("/systems/flows/rbac-drift");
}
