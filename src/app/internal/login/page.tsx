import { Suspense } from "react";
import { LoginPage } from "@/features/auth/login-page";
import { FullPageLoader } from "@/shared/components/ui/states";

export const dynamic = "force-dynamic";

export default function InternalLoginRoute() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <LoginPage />
    </Suspense>
  );
}
