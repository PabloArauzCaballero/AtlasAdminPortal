export type SelectOption = { label: string; value: string };

export function uniqueTextOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }) satisfies SelectOption);
}
