const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:"]);
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isSafeExternalUrl(value: string): boolean {
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
    if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return true;
    return parsed.protocol === "http:" && LOCALHOST_NAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}
