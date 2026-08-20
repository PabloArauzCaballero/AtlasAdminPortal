"use client";

import { useQuery } from "@tanstack/react-query";
import { listEndpoints } from "./services";
import type { EndpointItem } from "./types";

/**
 * TODOS los endpoints del catálogo, para los selectores que deben ofrecerlos todos.
 *
 * Tres pantallas pedían `limit: 200` a `/systems/endpoints`, cuyo esquema Zod topa el límite en
 * 100. La respuesta era un 400 `VALIDATION_ERROR` —«Too big: expected number to be <=100»— así que
 * el desplegable quedaba VACÍO y no se podía crear un perfil de carga ni añadir un paso a una suite
 * de QA. Y el fallo no se veía: la petición moría en la consola del navegador, sin ninguna tarjeta
 * de error, dejando un selector que parecía «sin endpoints» sobre un catálogo con más de
 * cuatrocientos.
 *
 * Bajar el límite a 100 habría cambiado un fallo evidente por uno silencioso: un desplegable que
 * ofrece los primeros cien de cuatrocientos, sin decirlo. Se pagina hasta agotar el catálogo.
 */

/** Tope de páginas. Es un cortafuegos contra un backend que nunca deje de paginar, no una política. */
const MAX_PAGES = 20;
const PAGE_SIZE = 100;

export async function fetchAllEndpoints(): Promise<EndpointItem[]> {
  const items: EndpointItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await listEndpoints({ page, limit: PAGE_SIZE });
    items.push(...(response.items as EndpointItem[]));
    const total = response.meta?.total ?? items.length;
    if (items.length >= total || response.items.length === 0) break;
  }
  return items;
}

export function useAllEndpoints() {
  return useQuery({
    queryKey: ["systems", "endpoints", "all"] as const,
    queryFn: fetchAllEndpoints,
    // El catálogo cambia con un descubrimiento o una federación, no entre dos aperturas de un
    // desplegable: cinco peticiones por cada vez que se abre un formulario no tienen sentido.
    staleTime: 5 * 60 * 1000,
  });
}
