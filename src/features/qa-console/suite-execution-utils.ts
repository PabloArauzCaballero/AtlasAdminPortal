export const DEFAULT_LOCAL_BASE_URL = "http://localhost:3005";
export const DEFAULT_HEADERS = '{\n  "authorization": "Bearer <token-qa>"\n}';

export function normalizeExecutionEnvironments(
  scope: string[],
  productionSafe: boolean,
): string[] {
  const normalized = scope.map((value) => value.toUpperCase());
  const values = normalized.length > 0 ? normalized : ["LOCAL"];
  return values.filter(
    (value) => value !== "PRODUCTION_READONLY" || productionSafe,
  );
}

export function validateExecutionForm(input: {
  dryRun: boolean;
  baseUrl: string;
  headersText: string;
  configText: string;
}): string | null {
  if (!input.dryRun && input.baseUrl.trim().length === 0) {
    return "Para una corrida real debes indicar Base URL.";
  }
  try {
    parseJsonRecord(input.headersText);
    parseJsonRecord(input.configText);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "JSON invalido.";
  }
}

export function parseJsonRecord(value: string): Record<string, unknown> {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Headers y config deben ser objetos JSON.");
  }
  return parsed as Record<string, unknown>;
}

export function normalizeHeaders(
  value: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, headerValue]) => [
      key,
      String(headerValue),
    ]),
  );
}
