"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * App Router has no built-in route-change events, so we approximate one:
 * a capturing click listener flags "navigating" as soon as an internal link
 * is clicked, and the pathname/search-params effect clears it once the new
 * route has actually rendered. Without this, slow navigations (auth-gated
 * client fetches) look like the app froze rather than being in progress.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const previousKey = useRef(`${pathname}?${searchParams?.toString()}`);

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString()}`;
    if (previousKey.current !== key) {
      previousKey.current = key;
    }
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      const destination = href.split("?")[0];
      if (destination === pathname) return;
      setLoading(true);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!loading) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-transparent"
      role="status"
      aria-label="Cargando página"
    >
      <div className="h-full w-1/3 animate-route-progress bg-gradient-to-r from-atlas-accent via-blue-500 to-atlas-accent" />
    </div>
  );
}
