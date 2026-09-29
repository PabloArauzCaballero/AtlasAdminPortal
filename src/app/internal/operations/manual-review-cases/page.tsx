import { redirect } from "next/navigation";
import { workQueueRedirectHref } from "@/features/operations-cases/work-queue-tabs";

/**
 * La pantalla propia se fusionó en la «Cola de trabajo» (pestaña `?cola=manual_review`). La ruta se
 * conserva como redirección, con los parámetros que traiga, para no romper marcadores ni enlaces.
 */
export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  redirect(workQueueRedirectHref("manual_review", await searchParams));
}
