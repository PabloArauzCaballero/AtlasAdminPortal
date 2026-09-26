import type { CredentialField } from "./types";

/** Campos rotables por método. Ofrecer los que el proveedor no usa solo induce errores. */
export const FIELDS_BY_METHOD: Record<string, CredentialField[]> = {
  oauth2_client_credentials: ["CLIENT_ID", "CLIENT_SECRET"],
  jwt_bearer: ["CLIENT_ID", "PRIVATE_KEY"],
  mtls: ["PRIVATE_KEY"],
  api_key: ["API_KEY"],
  none: [],
};
