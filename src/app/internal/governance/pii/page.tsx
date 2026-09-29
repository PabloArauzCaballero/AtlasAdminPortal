import { redirect } from "next/navigation";
import {
  redirectWithParams,
  type RouteSearchParams,
} from "@/shared/lib/redirect-with-params";

/** El registro de datos personales es ahora la pestaña «Datos personales» de Gobierno de datos. */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: RouteSearchParams }>) {
  redirect(
    redirectWithParams("/internal/governance", await searchParams, {
      tab: "datos-personales",
    }),
  );
}
