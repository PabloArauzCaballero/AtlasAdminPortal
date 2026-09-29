import { redirect } from "next/navigation";
import {
  redirectWithParams,
  type RouteSearchParams,
} from "@/shared/lib/redirect-with-params";

/** «Lineage oficial» es ahora la pestaña «Grafo» de Lineage; los marcadores siguen funcionando. */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: RouteSearchParams }>) {
  redirect(
    redirectWithParams("/internal/lineage", await searchParams, {
      vista: "grafo",
    }),
  );
}
