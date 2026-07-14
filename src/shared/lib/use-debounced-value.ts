import { useEffect, useState } from "react";

/**
 * Debounces a fast-changing value (e.g. search input) so dependent effects
 * (network requests) don't fire on every keystroke. 350ms is the sweet spot
 * for typeahead: fast enough to feel live, slow enough to avoid a request per
 * character while the user is still typing.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
