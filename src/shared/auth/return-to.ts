const INTERNAL_PREFIX = "/internal";
const LOGIN_PATH = "/internal/login";

export function sanitizeInternalReturnTo(value: string | null): string {
  if (!value) return INTERNAL_PREFIX;

  try {
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith(`${INTERNAL_PREFIX}/`) &&
      decoded !== INTERNAL_PREFIX
    ) {
      return INTERNAL_PREFIX;
    }
    if (decoded.startsWith(LOGIN_PATH)) return INTERNAL_PREFIX;
    if (decoded.includes("//")) return INTERNAL_PREFIX;
    return decoded;
  } catch {
    return INTERNAL_PREFIX;
  }
}
