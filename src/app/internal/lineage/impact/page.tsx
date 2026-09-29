import { redirect } from "next/navigation";
import {
  redirectWithParams,
  type RouteSearchParams,
} from "@/shared/lib/redirect-with-params";

/** «Impacto lineage» es ahora la pestaña «Relaciones e impacto» de Lineage. */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: RouteSearchParams }>) {
  redirect(
    redirectWithParams("/internal/lineage", await searchParams, {
      vista: "impacto",
    }),
  );
}
