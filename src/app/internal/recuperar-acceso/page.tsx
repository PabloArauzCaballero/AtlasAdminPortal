import { Suspense } from "react";
import { RecoverAccessPage } from "@/features/auth/recover-access-page";
import { FullPageLoader } from "@/shared/components/ui/states";

export default function InternalRecoverAccessRoute() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RecoverAccessPage />
    </Suspense>
  );
}
