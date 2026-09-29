import { apiRequest } from "@/shared/api/client";
import type {
  PendingWorkQuery,
  PendingWorkResponse,
  RbacDriftQuery,
  RbacDriftResponse,
} from "./types";

export function getPendingWork(query: PendingWorkQuery) {
  return apiRequest<PendingWorkResponse>("/systems/flows/pending-work", {
    query,
  });
}

export function getRbacDrift(query: RbacDriftQuery = {}) {
  return apiRequest<RbacDriftResponse>("/systems/flows/rbac-drift", { query });
}
