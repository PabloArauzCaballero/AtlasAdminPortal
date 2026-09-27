"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchFakerCases,
  fetchFakerCatalog,
  type FakerParamsByType,
} from "./faker-client";
import type { FakerCatalog, FakerContext, FakerVariant } from "./faker-types";
import { QA_SEED_CATALOG } from "../qa-seed-catalog";

/** Los tipos del generador cuyos parámetros se pueden ajustar desde el Lab. */
export const ADJUSTABLE_FAKER_TYPES = ["caso", "monto"] as const;

export function useFakerCatalog() {
  return useQuery<FakerCatalog>({
    queryKey: ["qa-fakers", "catalog"],
    queryFn: fetchFakerCatalog,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

function casesKey(
  seed: string,
  variant: FakerVariant,
  count: number,
  params: FakerParamsByType,
) {
  return ["qa-fakers", "cases", seed, variant, count, params] as const;
}

/**
 * Estado compartido de «qué datos de prueba se usan»: la semilla, los parámetros del panel y el
 * caso base (el primero del lote válido) que resuelven los ejemplos con marcadores.
 */
export function useQaTestData() {
  const queryClient = useQueryClient();
  const [rawSeed, setSeed] = useState<string>(QA_SEED_CATALOG[0].seed);
  const [params, setParams] = useState<FakerParamsByType>({});
  const catalog = useFakerCatalog();
  const seed = rawSeed.trim() || QA_SEED_CATALOG[0].seed;

  const baseCase = useQuery<FakerContext[]>({
    queryKey: casesKey(seed, "valido", 1, params),
    queryFn: () =>
      fetchFakerCases({ seed, count: 1, variant: "valido", params }),
    staleTime: Infinity,
    retry: 1,
  });

  const fetchCases = useCallback(
    (variant: FakerVariant, count: number) =>
      queryClient.fetchQuery({
        queryKey: casesKey(seed, variant, count, params),
        queryFn: () => fetchFakerCases({ seed, count, variant, params }),
        staleTime: Infinity,
      }),
    [queryClient, seed, params],
  );

  const setParam = useCallback(
    (type: string, name: string, value: string | number | undefined) => {
      setParams((current) => {
        const forType = { ...(current[type] ?? {}) };
        if (value === undefined || value === "") delete forType[name];
        else forType[name] = value;
        const next = { ...current, [type]: forType };
        if (Object.keys(forType).length === 0) delete next[type];
        return next;
      });
    },
    [],
  );

  return useMemo(
    () => ({
      seed,
      rawSeed,
      setSeed,
      params,
      setParam,
      resetParams: () => setParams({}),
      catalog,
      baseCase,
      fetchCases,
    }),
    [seed, rawSeed, params, setParam, catalog, baseCase, fetchCases],
  );
}

export type QaTestData = ReturnType<typeof useQaTestData>;
