import { vi } from "vitest";
import type { QaTestData } from "@/features/qa-lab/fakers/use-fakers";
import { fakeCase, fakeCases } from "./faker-fixtures";

/**
 * `useQaTestData` sin red: un lote fijo con la forma del mock. Los objetos son ESTABLES entre
 * renders (como los de react-query), o el autorrelleno de los formularios entraría en bucle.
 */
const baseCase = { data: [fakeCase(0)], error: null, isLoading: false };
const catalog = { data: undefined, error: null, isLoading: false };

export const qaTestDataStub = {
  seed: "qa-base",
  rawSeed: "qa-base",
  setSeed: vi.fn(),
  params: {},
  setParam: vi.fn(),
  resetParams: vi.fn(),
  catalog,
  baseCase,
  fetchCases: vi.fn(async (_variant: string, count: number) =>
    fakeCases(count),
  ),
} as unknown as QaTestData;
