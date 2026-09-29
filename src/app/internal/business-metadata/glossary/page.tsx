import { redirect } from "next/navigation";
import {
  redirectWithParams,
  type RouteSearchParams,
} from "@/shared/lib/redirect-with-params";

/** El glosario es ahora la pestaña «Términos» de «Dominios y glosario». La ficha `[termId]` se conserva. */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: RouteSearchParams }>) {
  redirect(
    redirectWithParams(
      "/internal/business-metadata/domains",
      await searchParams,
      {
        tab: "terminos",
      },
    ),
  );
}
