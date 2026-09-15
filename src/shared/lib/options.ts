/**
 * La opción de un select, ÚNICA en todo el portal.
 *
 * `description` es «qué significa y cuándo elegirla»: se ve siempre en la fila desplegada y la
 * opción elegida la repite bajo el campo. Las opciones que son ENTIDADES (una cola, un endpoint,
 * un contrato…) llevan su ficha resumida por plantilla; las que salen de los datos sin mapa de
 * dominio van sin descripción, nunca con texto inventado.
 */
export type Option = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

/** @deprecated Usa `Option`. Se conserva mientras dure la migración. */
export type SelectOption = Option;

/**
 * Opciones a partir de los valores distintos de una columna (filtros derivados de los datos).
 *
 * `descriptions` es el mapa de dominio cuando existe (`{ ACTIVE: "Sigue operando…" }`): las
 * opciones que estén en él llevan descripción y etiqueta; el resto van con la etiqueta = código y
 * SIN descripción, porque un texto inventado sería peor que ninguno.
 */
export function uniqueTextOptions(
  values: Array<string | null | undefined>,
  descriptions?: Record<
    string,
    string | { label: string; description: string }
  >,
): Option[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => {
      const known = descriptions?.[value];
      if (!known) return { value, label: value };
      if (typeof known === "string")
        return { value, label: value, description: known };
      return { value, label: known.label, description: known.description };
    });
}

/**
 * Convierte un catálogo `{ value, label, description }` en el mapa que espera
 * `uniqueTextOptions`: así un dominio cerrado se describe UNA vez y sirve también a los filtros
 * derivados de los datos.
 */
export function optionsToDescriptions(
  options: ReadonlyArray<Option>,
): Record<string, { label: string; description: string }> {
  return Object.fromEntries(
    options
      .filter((option) => option.description)
      .map((option) => [
        option.value,
        { label: option.label, description: option.description ?? "" },
      ]),
  );
}

/** Minúsculas y sin tildes: para buscar «facturacion» y encontrar «Facturación». */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Busca la etiqueta de un valor en un catálogo; si no está, devuelve el valor tal cual. */
export function optionLabel(
  options: ReadonlyArray<Option>,
  value: string | null | undefined,
): string {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label ?? value;
}
