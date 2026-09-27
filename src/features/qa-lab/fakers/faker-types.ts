/**
 * Forma del catálogo y de los lotes que publica el generador de datos de prueba
 * (`AtlasExternalProvidersMock`, rutas `/mock/fakers`). El portal nunca habla con el mock
 * directamente: pasa por su propio reenvío `/api/qa-fakers/...` (ver `faker-proxy.ts`).
 */
export type FakerParamKind = "int" | "number" | "enum" | "string" | "date";

export type FakerParamOption = { value: string; label: string };

export type FakerParam = {
  name: string;
  label: string;
  kind: FakerParamKind;
  default?: string | number;
  min?: number;
  max?: number;
  options?: FakerParamOption[];
  help?: string;
};

export type FakerTypeEntry = {
  type: string;
  label: string;
  description?: string;
  fields: string[];
  params: FakerParam[];
};

export type FakerVariant = "valido" | "frontera" | "invalido";

export type FakerCatalog = {
  referenceDate: string;
  limits: { maxCount: number; maxSeedLength: number };
  variants: { value: FakerVariant; label: string; help?: string }[];
  types: FakerTypeEntry[];
};

export type FakerParamValues = Record<string, string | number>;

export type FakerBatchRequest = {
  seed: string;
  count: number;
  variant: FakerVariant;
  params?: FakerParamValues;
};

/** En la variante inválida cada elemento dice qué regla rompe. */
export type FakerInvalidMark = { field: string; reason: string };

export type FakerItem = Record<string, unknown> & {
  _invalid?: FakerInvalidMark;
};

export type FakerBatch = {
  type: string;
  seed: string;
  count: number;
  variant: FakerVariant;
  params: FakerParamValues;
  referenceDate: string;
  items: FakerItem[];
};

/**
 * Un «caso» resuelto: lo que una plantilla `{{faker.<tipo>.<campo>}}` puede leer. Hoy son dos
 * tipos del mock pedidos con la MISMA semilla: `caso` (persona, dirección, dispositivo, perfil
 * financiero, cuenta) y `monto`.
 */
export type FakerContext = {
  caso?: FakerItem;
  monto?: FakerItem;
};
