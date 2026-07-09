"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/shared/components/layout/app-shell";
import { useAuth } from "./auth-context";
import { sanitizeInternalReturnTo } from "./return-to";
import { FullPageLoader } from "@/shared/components/ui/states";

export function InternalProtectedShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isHydrated, refreshProfile, restoreSessionFromServer } =
    useAuth();
  const refreshedRef = useRef(false);
  const restoredRef = useRef(false);
  const isLogin = pathname === "/internal/login";

  useEffect(() => {
    if (!isHydrated || isLogin) return;

    if (!session && !restoredRef.current) {
      restoredRef.current = true;
      void restoreSessionFromServer().then((restored) => {
        if (!restored) redirectToLogin(pathname, searchParams, router);
      });
      return;
    }

    if (!session && restoredRef.current) {
      redirectToLogin(pathname, searchParams, router);
      return;
    }

    if (session && !refreshedRef.current) {
      refreshedRef.current = true;
      void refreshProfile().then((refreshed) => {
        if (!refreshed) router.replace("/internal/login");
      });
    }
  }, [
    isHydrated,
    isLogin,
    pathname,
    refreshProfile,
    restoreSessionFromServer,
    router,
    searchParams,
    session,
  ]);

  if (isLogin) return <>{children}</>;
  if (!isHydrated || !session) return <FullPageLoader />;
  return <AppShell>{children}</AppShell>;
}

function redirectToLogin(
  pathname: string,
  searchParams: URLSearchParams,
  router: ReturnType<typeof useRouter>,
) {
  const query = searchParams.toString();
  const current = `${pathname}${query ? `?${query}` : ""}`;
  router.replace(
    `/internal/login?returnTo=${encodeURIComponent(sanitizeInternalReturnTo(current))}`,
  );
}
