"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/shared/api/query-keys";
import * as api from "./services";
import type { Nivel, Nodo } from "./types";

/**
 * Las consultas del explorador.
 *
 * Dos decisiones que se repiten: los hijos de una carpeta se piden SOLO cuando esa carpeta está
 * abierta —una tabla de expedientes con veinte filas no puede pedir el árbol entero de cada uno—,
 * y el contenido de un archivo se cachea sin caducidad porque un objeto ya escrito no cambia:
 * volver a pedirlo al reenfocar la pestaña sólo mueve megas de datos personales por la red.
 */
export function useExpedientes(params: {
  page: number;
  pageSize: number;
  q?: string;
  estado?: string;
}) {
  return useQuery({
    queryKey: queryKeys.expedientes(params),
    queryFn: () => api.listarExpedientes(params),
  });
}

export function useExpediente(expedienteId: string) {
  return useQuery({
    queryKey: queryKeys.expediente(expedienteId),
    queryFn: () => api.obtenerExpediente(expedienteId),
    enabled: Boolean(expedienteId),
  });
}

export function useExpedientePorCliente(customerId: string, habilitado = true) {
  return useQuery({
    queryKey: queryKeys.expedientePorCliente(customerId),
    queryFn: () => api.expedientePorCliente(customerId),
    enabled: habilitado && Boolean(customerId),
  });
}

export function useNodos(
  expedienteId: string,
  parentId: string | null,
  opciones: {
    q?: string;
    incluirPapelera?: boolean;
    habilitado?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.expedienteNodos(expedienteId, parentId, opciones.q),
    queryFn: () =>
      api.listarNodos(expedienteId, {
        ...(opciones.q
          ? { q: opciones.q }
          : { parentId: parentId ?? undefined }),
        incluirPapelera: opciones.incluirPapelera ? "true" : "false",
      }),
    enabled: (opciones.habilitado ?? true) && Boolean(expedienteId),
  });
}

/**
 * El contenido de un archivo, como URL de objeto local.
 *
 * Se libera al cambiar de archivo o desmontar: sin eso, cada documento abierto deja su blob en
 * memoria hasta recargar la pestaña, y en una sesión de revisión eso son decenas de megas de
 * imágenes de carnets que ya nadie mira.
 */
export function useContenido(expedienteId: string, nodo: Nodo | null) {
  const query = useQuery({
    queryKey: queryKeys.expedienteContenido(expedienteId, nodo?.nodoId ?? ""),
    queryFn: async () => {
      const archivo = await api.descargarNodo(expedienteId, nodo!);
      return {
        url: URL.createObjectURL(archivo.blob),
        contentType: archivo.contentType,
        blob: archivo.blob,
      };
    },
    enabled:
      Boolean(expedienteId) &&
      Boolean(nodo) &&
      nodo?.tipo === "archivo" &&
      !nodo?.objetoAusente,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const url = query.data?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [query.data?.url]);

  return query;
}

export function useActividad(
  expedienteId: string,
  params: { page: number; pageSize: number; nodoId?: string },
) {
  return useQuery({
    queryKey: queryKeys.expedienteActividad(expedienteId, params),
    queryFn: () => api.listarActividad(expedienteId, params),
    enabled: Boolean(expedienteId),
  });
}

export function useContactos(expedienteId: string, habilitado = true) {
  return useQuery({
    queryKey: queryKeys.expedienteContactos(expedienteId),
    queryFn: () => api.obtenerContactos(expedienteId),
    enabled: habilitado && Boolean(expedienteId),
  });
}

export function useConcesiones(expedienteId: string, nodoId: string | null) {
  return useQuery({
    queryKey: queryKeys.expedienteConcesiones(expedienteId, nodoId ?? ""),
    queryFn: () => api.listarConcesiones(expedienteId, nodoId!),
    enabled: Boolean(expedienteId) && Boolean(nodoId),
  });
}

/** Invalida lo que cambia tras una mutación del árbol: los nodos y la cabecera del expediente. */
function useRefrescarArbol(expedienteId: string) {
  const cliente = useQueryClient();
  return () => {
    void cliente.invalidateQueries({
      queryKey: ["expedientes", "nodos", expedienteId],
    });
    void cliente.invalidateQueries({
      queryKey: queryKeys.expediente(expedienteId),
    });
  };
}

export function useMutacionesDelArbol(expedienteId: string) {
  const refrescar = useRefrescarArbol(expedienteId);

  const crearCarpeta = useMutation({
    mutationFn: (input: { parentId: string | null; nombre: string }) =>
      api.crearCarpeta(expedienteId, input),
    onSuccess: refrescar,
  });

  const renombrar = useMutation({
    mutationFn: (input: { nodoId: string; nombre: string }) =>
      api.actualizarNodo(expedienteId, input.nodoId, { nombre: input.nombre }),
    onSuccess: refrescar,
  });

  const mover = useMutation({
    mutationFn: (input: { nodoId: string; parentId: string | null }) =>
      api.actualizarNodo(expedienteId, input.nodoId, {
        parentId: input.parentId,
      }),
    onSuccess: refrescar,
  });

  const borrar = useMutation({
    mutationFn: (nodoId: string) => api.borrarNodo(expedienteId, nodoId),
    onSuccess: refrescar,
  });

  const restaurar = useMutation({
    mutationFn: (nodoId: string) => api.restaurarNodo(expedienteId, nodoId),
    onSuccess: refrescar,
  });

  return { crearCarpeta, renombrar, mover, borrar, restaurar };
}

export function useCompartir(expedienteId: string, nodoId: string | null) {
  const cliente = useQueryClient();
  const refrescar = () => {
    if (nodoId)
      void cliente.invalidateQueries({
        queryKey: queryKeys.expedienteConcesiones(expedienteId, nodoId),
      });
  };

  const conceder = useMutation({
    mutationFn: (input: {
      principalTipo: "rol" | "usuario_interno";
      principalId: string;
      nivel: Nivel;
      motivo: string;
      venceEn?: string;
    }) => api.conceder(expedienteId, nodoId!, input),
    onSuccess: refrescar,
  });

  const revocar = useMutation({
    mutationFn: (grantId: string) =>
      api.revocar(expedienteId, nodoId!, grantId),
    onSuccess: refrescar,
  });

  return { conceder, revocar };
}
