const SENSITIVE_KEYS = [
  "authorization",
  "accessToken",
  "refreshToken",
  "password",
  "passwordHash",
  "token",
  "secret",
  "cookie",
  "csrf",
];

export function sanitizeQaValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeQaValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[redacted]" : sanitizeQaValue(item, depth + 1),
    ]),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((item) => normalized.includes(item.toLowerCase()));
}
