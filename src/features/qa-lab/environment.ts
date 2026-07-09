import { getApiBaseUrl } from "@/shared/api/config";

export type QaEnvironment = "LOCAL" | "STAGING" | "PRODUCTION_READONLY" | string;

const LOCAL_API_BASE_URL = "http://localhost:3005/api/v1";

export function getQaEnvironmentBaseUrl(environment: QaEnvironment): string {
  const normalized = environment.trim().toUpperCase();
  if (normalized === "STAGING") {
    return process.env.NEXT_PUBLIC_STAGING_API_BASE_URL?.trim() || getApiBaseUrl();
  }
  if (normalized === "PRODUCTION_READONLY") {
    return (
      process.env.NEXT_PUBLIC_PROD_READONLY_API_BASE_URL?.trim() ||
      getApiBaseUrl()
    );
  }
  return process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL?.trim() || LOCAL_API_BASE_URL;
}
