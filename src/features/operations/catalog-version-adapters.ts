import { omitIfBlank, parseJsonRecord } from "./catalog-schema-primitives";
import type { CatalogIngestionForm } from "./catalog-ingestion-schema";
import type {
  CatalogDecisionForm,
  CreateCatalogVersionForm,
} from "./catalog-version-schema";
import type {
  CatalogDecisionInput,
  CatalogIngestionInput,
  CreateCatalogVersionInput,
} from "./catalog-version-types";
import type { ActivateRulesetForm } from "./risk-ruleset-schema";
import type { ActivateRulesetInput } from "./catalog-version-types";

/**
 * Traducen el formulario (todo strings, como lo edita el operador) al body que
 * espera el backend. Están fuera de los componentes para poder probar la
 * conversión sin montar la pantalla.
 *
 * Lo que resuelven en un solo lugar: el backend distingue `undefined` de `""`
 * (un `""` rompe sus `min()`), así que cada campo opcional vacío se omite en
 * vez de mandarse; y `attributes`/`rawPayload` viajan como objeto JSON aunque
 * el formulario los edite como texto.
 */

/** Los esquemas ya validaron que el texto es un objeto JSON: acá el fallo es imposible. */
function jsonRecordOrEmpty(text: string): Record<string, unknown> {
  const parsed = parseJsonRecord(text);
  return parsed.ok ? parsed.value : {};
}

export function toCreateCatalogVersionInput(
  form: CreateCatalogVersionForm,
): CreateCatalogVersionInput {
  return {
    versionCode: form.versionCode.trim(),
    validFrom: omitIfBlank(form.validFrom),
    validUntil: omitIfBlank(form.validUntil),
    notes: omitIfBlank(form.notes),
    items: form.items.map((item) => ({
      itemCode: item.itemCode.trim(),
      itemName: item.itemName.trim(),
      itemType: item.itemType.trim(),
      sourceCode: omitIfBlank(item.sourceCode),
      confidenceScore: omitIfBlank(item.confidenceScore),
      attributes: jsonRecordOrEmpty(item.attributesText),
      aliases: item.aliases.map((alias) => ({
        aliasValue: alias.aliasValue.trim(),
        aliasType: alias.aliasType.trim(),
        confidenceScore: omitIfBlank(alias.confidenceScore),
      })),
      riskMappings: item.riskMappings.map((mapping) => ({
        riskDimension: mapping.riskDimension.trim(),
        riskBand: mapping.riskBand.trim(),
        scorePointsSuggested: omitIfBlank(mapping.scorePointsSuggested),
        reasonCode: mapping.reasonCode.trim(),
        explanation: omitIfBlank(mapping.explanation),
        modelUsage: omitIfBlank(mapping.modelUsage),
        validFrom: omitIfBlank(mapping.validFrom),
        validUntil: omitIfBlank(mapping.validUntil),
      })),
    })),
  };
}

export function toCatalogDecisionInput(
  form: CatalogDecisionForm,
): CatalogDecisionInput {
  return {
    decision: form.decision,
    decisionReason: form.decisionReason.trim(),
    validFrom: omitIfBlank(form.validFrom),
    validUntil: omitIfBlank(form.validUntil),
  };
}

export function toCatalogIngestionInput(
  form: CatalogIngestionForm,
): CatalogIngestionInput {
  return {
    catalogCode: form.catalogCode.trim(),
    sourceType: form.sourceType.trim(),
    sourceName: form.sourceName.trim(),
    sourceCode: omitIfBlank(form.sourceCode),
    items: form.items.map((item) => ({
      rawValue: item.rawValue.trim(),
      normalizedValue: omitIfBlank(item.normalizedValue),
      itemType: item.itemType.trim(),
      confidenceScore: omitIfBlank(item.confidenceScore),
      rawPayload: jsonRecordOrEmpty(item.rawPayloadText),
      aiSuggested: item.aiSuggested,
    })),
  };
}

export function toActivateRulesetInput(
  form: ActivateRulesetForm,
): ActivateRulesetInput {
  return {
    activationReason: form.activationReason.trim(),
    effectiveFrom: omitIfBlank(form.effectiveFrom),
  };
}
