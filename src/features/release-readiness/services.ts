import { apiRequest } from "@/shared/api/client";
import type { ServerReleaseReadiness } from "./server-types";

export function getReleaseReadiness() {
  return apiRequest<ServerReleaseReadiness>("/internal/release-readiness");
}
