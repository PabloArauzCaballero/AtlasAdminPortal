# Plan de acción — Catálogo de columnas + granularidad de negocio en Systems Ops

> Backend: repo separado (no vive en `AtlasAdminPortal`). Este documento es la
> especificación que ese repo debe implementar. El frontend interno **ya lee**
> `columns`, `relatedTables`, `relatedColumns`, `relations` con múltiples alias
> defensivos (`src/features/systems/normalizers.ts`) — el bloqueo está 100% del
> lado backend/seed, confirmado contra el backend real (`localhost:3005`,
> 2026-07-07): `DataEntity` e `ImpactByTableResult` no traen columnas, y
> `relatedTables`/`relatedColumns`/`relations` del glosario siempre llegan `[]`.

## 0. Objetivo

1. Generar automáticamente, de forma **idempotente**, el catálogo de columnas
   de **todas** las tablas de la base (hoy 127 `data_entities` en 8+ módulos),
   igual que ya se hace con los endpoints (`information_schema_enriched`,
   `system_seed`, discovery + `DEPRECATED_CANDIDATE`).
2. Enriquecer cada tabla/columna con **dos capas de propósito**, no solo
   metadata técnica:
   - **Nivel sistema**: rol técnico (transaccional, auditoría, cache, config,
     staging, lookup, log inmutable, etc.), quién la escribe/lee (qué
     endpoints/tools), si es PK/FK, si participa en jobs.
   - **Nivel negocio**: qué decisión de negocio soporta (riesgo, cobranza,
     onboarding, cumplimiento, notificaciones al cliente), a quién le importa
     si cambia, y qué pasa si el dato es incorrecto o falta.
3. Cerrar los `PENDIENTE_ATLAS`/`RIESGO_ATLAS` ya registrados en
   `docs/pending/pending-items.md` (líneas 19, 56, 96, 108, 132, 192) sobre
   columnas independientes, lineage enriquecido y facetas de glosario.

## 1. Estado actual verificado (evidencia, no suposición)

Confirmado con requests reales contra `http://localhost:3005/api/v1` con un
usuario `SUPER_ADMIN`:

| Endpoint                                      | Campo esperado por frontend       | Realidad backend                                                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /systems/data-entities/:id`              | `columns[]`                       | **No existe la clave.**                                                                                                                                                                                                         |
| `GET /systems/impact/by-table/:schema/:table` | `columns[]`                       | **No existe la clave.**                                                                                                                                                                                                         |
| `GET /systems/impact/by-table/:schema/:table` | `endpointImpacts[]`               | **Sí existe y trae datos reales** (ej. 14 impactos en `attribute_definitions`), pero solo con `endpointId` — sin `fullPath`/`method` embebido (ya mitigado en frontend con `useEndpointsByIds`, ver commit de este mismo hilo). |
| `GET /internal/business-metadata/glossary`    | `relatedTables`, `relatedColumns` | Existen como claves pero **siempre `[]`**.                                                                                                                                                                                      |
| `GET /internal/business-metadata/terms/:id`   | `relations`                       | Existe como clave pero **siempre `[]`**. `audit[]` sí trae datos reales.                                                                                                                                                        |

Conclusión: el contrato (forma/nombres de campo) ya está bien diseñado y
alineado con lo que el frontend consume. Lo que falta es **población de
datos**, no forma de respuesta.

## 2. Diseño del catálogo de columnas

### 2.1 Tabla `data_catalog_columns` (nueva, si no existe)

Debe calzar 1:1 con el tipo que el frontend ya declara en
`src/features/systems/types/catalog-types.ts` (`DataEntityColumn`):

```
column_id            bigint PK
data_entity_id        FK -> data_entities.entity_id   (NOT NULL)
column_name           text NOT NULL
ordinal_position       int
business_name          text NULL
data_type              text NULL   -- desde information_schema.columns.data_type
is_nullable            boolean NULL
is_primary_key          boolean DEFAULT false
is_foreign_key          boolean DEFAULT false
references_entity_id    FK -> data_entities.entity_id NULL   -- para relaciones
references_column_name  text NULL
default_value           text NULL
business_description     text NULL
technical_description     text NULL
contains_pii             boolean DEFAULT false
pii_type                 text NULL
contains_sensitive        boolean DEFAULT false
contains_financial         boolean DEFAULT false
used_in_scoring            boolean DEFAULT false
used_in_ml                 boolean DEFAULT false
validation_rule            text NULL
allowed_values              jsonb NULL
system_purpose               text NULL   -- nuevo: "para qué sirve a nivel sistema"
business_purpose              text NULL   -- nuevo: "para qué sirve a nivel negocio"
detected_from                text NOT NULL  -- 'information_schema_enriched' | 'manual' | 'llm_assisted'
confidence_level               text NOT NULL DEFAULT 'MEDIUM'
review_status                   text NOT NULL DEFAULT 'AUTO_DETECTED'
created_at / updated_at
UNIQUE (data_entity_id, column_name)   -- clave natural para upsert idempotente
```

### 2.2 Fuente de introspección (paso automático, sin intervención humana)

Usar `information_schema` igual que ya se hizo para poblar `data_entities`
(`detectedFrom: information_schema_enriched`):

- `information_schema.columns` → nombre, tipo, nullable, default, posición.
- `information_schema.key_column_usage` + `table_constraints` (`PRIMARY KEY`)
  → `is_primary_key`.
- `information_schema.constraint_column_usage` +
  `referential_constraints` → `is_foreign_key`, `references_entity_id`,
  `references_column_name`. **Esto es lo que alimenta las "relaciones" que
  hoy se ven vacías** en tabla de datos y en glosario.
- Heurísticas de nombre (igual que ya existen para PII/riesgo en
  `data_entities`) para pre-marcar `contains_pii`, `contains_financial`,
  `contains_sensitive` (ej. columnas `*_email`, `*_phone`, `*_dni`, `*_score`,
  `*_amount`, `*_balance`) con `confidence_level: MEDIUM` y
  `review_status: NEEDS_REVIEW` — nunca `APPROVED` automáticamente.

### 2.3 Idempotencia del seed

Mismo patrón que `POST /systems/endpoints/catalog-seed/refresh` y
`POST /systems/endpoints/discover` (ya implementados y ya marcan
`DEPRECATED_CANDIDATE` para lo que desapareció del código):

1. **Upsert** por `(data_entity_id, column_name)`: si ya existe, actualizar
   solo campos técnicos (`data_type`, `is_nullable`, `ordinal_position`,
   `is_primary_key`, `is_foreign_key`, referencias) — **nunca pisar**
   `business_description`/`business_purpose`/`system_purpose` si ya fueron
   editados manualmente (usar un flag `manually_edited_at` o comparar
   `detected_from != 'manual'` antes de sobrescribir esos 3 campos).
2. **Columnas eliminadas de la BD real** → marcar `status: DEPRECATED_CANDIDATE`
   en vez de borrar la fila (mismo criterio que endpoints).
3. Ejecutar como parte de `refreshCatalogSeed` (extender el mismo endpoint
   `POST /systems/endpoints/catalog-seed/refresh`, agregando un contador
   `columns` al `CatalogSeedRefreshResult`) para no crear un flujo paralelo
   que el frontend deba aprender a llamar aparte.
4. Debe ser **re-ejecutable en cualquier momento sin duplicar filas** (esto es
   lo que "idempotente" exige) y sin requerir downtime.

## 3. Exposición vía API (ajuste de contrato)

Opción recomendada — **extender lo que ya existe**, no crear endpoints nuevos
sueltos:

- `GET /systems/data-entities/:entityId` → agregar `data.columns[]`.
- `GET /systems/impact/by-table/:schema/:table` → agregar `data.columns[]`
  Y agregar `data.relations[]` (`{ column, referencesEntityId, referencesColumn }`)
  derivado de FKs, para que "relaciones" deje de estar vacío en el frontend.
- Nuevo endpoint de revisión: `PATCH /systems/data-entities/columns/:columnId/review`
  (mismo shape que `ReviewDecisionRequest` que ya usan los otros 5 endpoints
  de `SystemsReviewController`) para permitir aprobar/rechazar
  `business_description`/`business_purpose`/PII por columna desde
  `review-queue` — agregar `data_column_impacts` (o similar) como nuevo `type`
  en `GET /systems/review-queue`.
- Actualizar `openapi-systems-ops.yaml` con estos campos nuevos antes de
  congelar contrato (esto ya está pedido como pendiente general en
  `pending-items.md` Fase 11: "congelar OpenAPI interna").

El frontend **no necesita cambios** para leer `columns`/`relations` una vez
que el backend los entregue: `ColumnCatalogSection`,
`normalizeDataEntity`/`normalizeTableImpact` y `EntityGovernanceSummary` ya
están preparados con los alias correctos.

## 4. Enriquecimiento de negocio (las dos capas de "para qué sirve")

Esto es lo que distingue un catálogo técnico de uno realmente útil para
negocio. Para cada **tabla** y cada **columna**, capturar:

- `system_purpose`: rol técnico en el sistema — ej. _"Tabla transaccional que
  registra cada decisión de scoring; se escribe desde
  `POST /operations/risk-policy/ruleset-versions/:id/activate` y se lee para
  auditoría regulatoria."_
- `business_purpose`: impacto de negocio — ej. _"Si esta columna se corrompe,
  el motor de riesgo puede aprobar créditos con reglas obsoletas; afecta
  directamente pérdida esperada y cumplimiento normativo."_

Proceso propuesto (evita bloquear el seed automático con trabajo manual):

1. **Fase automática (seed idempotente, hoy)**: solo campos técnicos +
   heurísticas PII/financiero, `review_status: AUTO_DETECTED` o
   `NEEDS_REVIEW`. `system_purpose`/`business_purpose` quedan `NULL`.
2. **Fase asistida (borrador)**: un job batch (puede ser LLM-assisted, pero
   corre server-side y no bloquea el request del usuario) redacta un primer
   borrador de `system_purpose`/`business_purpose` por tabla usando: nombre
   de tabla/columna, `module`, `businessPurpose` ya existente en
   `data_entities`, y los `endpointImpacts`/`fieldImpacts` reales de esa
   tabla (para saber en qué flujo de negocio participa). Se guarda con
   `detected_from: llm_assisted`, `review_status: NEEDS_REVIEW` — **nunca
   `APPROVED` sin humano**.
3. **Fase de revisión humana**: data owners (`dataOwner` ya existe en
   `data_entities`) aprueban/editan desde `review-queue` en el frontend
   (reutilizando `ReviewDecisionRequest` + badges de `reviewStatus` que ya
   existen en toda la UI).

Esto reutiliza exactamente el patrón `AUTO_DETECTED → NEEDS_REVIEW →
APPROVED/REJECTED` que ya gobierna endpoints, entidades, impactos y
requisitos de herramientas — no se inventa un flujo nuevo.

## 5. Ídem para glosario/dominios/definiciones (mismo patrón, otro dueño de dato)

El usuario reportó el mismo síntoma en "dominios, glosario, definiciones".
Verificado: `relatedTables`/`relatedColumns`/`relations` en
`/internal/business-metadata/*` están vacíos por la misma razón (falta el
join, no falta el campo). Una vez que exista `data_catalog_columns` con
`references_entity_id` poblado (sección 2.2), la tarea de backend es:

- Poblar `relatedTables` de un término de glosario cruzando `domain`/`module`
  contra `data_entities.module`.
- Poblar `relatedColumns` cruzando contra `data_catalog_columns` cuyo
  `business_name`/`column_name` matchee semánticamente el `key`/`synonyms`
  del término (o, más simple y confiable: mantener una tabla puente
  `business_term_columns (term_id, data_entity_id, column_id)` curada, en vez
  de matching difuso).
- Poblar `relations[]` del detalle de término con los `references_entity_id`
  reales de FKs (sección 2.2), no con matching de texto.

## 6. Checklist de aceptación

- [ ] `data_catalog_columns` creada y poblada para las 127 tablas actuales
      (0 tablas sin al menos sus columnas técnicas).
- [ ] Seed re-ejecutable sin duplicar filas ni pisar ediciones manuales
      (probar: correr el seed 2 veces seguidas → mismo conteo de filas).
- [ ] `GET /systems/data-entities/:id` y `GET /systems/impact/by-table/...`
      devuelven `columns[]` no vacío para tablas con columnas reales.
- [ ] `GET /systems/impact/by-table/...` devuelve `relations[]` con al menos
      las FKs reales detectadas por `information_schema`.
- [ ] `openapi-systems-ops.yaml` actualizado con los campos nuevos.
- [ ] Nuevo tipo `data_column_impacts` (o el nombre que se defina) disponible
      en `GET /systems/review-queue` y su endpoint `PATCH .../review`.
- [ ] Al menos el 100% de columnas con heurística PII/financiera activada
      quedan en `NEEDS_REVIEW` (ninguna en `APPROVED` sin revisión humana).
- [ ] `relatedTables`/`relatedColumns`/`relations` de glosario dejan de venir
      `[]` para los términos con dominio mapeado a un módulo real.
- [ ] Frontend (`ColumnCatalogSection`, `RelatedEndpointsSection`,
      `BusinessTermDetailPage`) muestra datos reales sin cambios de código
      adicionales (validación manual en `/internal/data-catalog/tables/:id`
      y `/internal/business-glossary/:termId`).

## 7. Fuera de alcance de este plan

- No se reemplaza `fieldImpacts` (impacto de campo por endpoint) — es
  complementario: `fieldImpacts` describe _qué endpoint toca qué campo_,
  `data_catalog_columns` describe _qué es y para qué sirve el campo en sí_.
  Ambos deben coexistir y, cuando aplique, referenciarse por
  `(data_entity_id, column_name)`.
- No se define aquí el masking/exportación de columnas sensibles (ya
  registrado como pendiente aparte en Fase 3 de `pending-items.md`).
- No se resuelve en este plan el patrón repetido de IDs sin resolver
  (`#endpointId` crudo) en `review-queue`/`qa-stress`/`qa-console` — es un
  tema de UX frontend independiente, ya identificado, no de datos faltantes.

## 8. Referencia cruzada

- `docs/pending/pending-items.md:19,56,96,108,132,192` — pendientes previos
  que este plan cierra.
- `openapi-systems-ops.yaml` — contrato actual a extender.
- `src/features/systems/types/catalog-types.ts` (`DataEntityColumn`) — forma
  exacta que el frontend ya espera; usarla como fuente de verdad para el
  shape de `data_catalog_columns`.
- `src/features/systems/normalizers.ts` (`normalizeDataEntity`,
  `normalizeTableImpact`) — aliases ya soportados (`columns`, `fields`,
  `tableColumns`, `dataColumns`) por si el backend prefiere nombrar la clave
  distinto a `columns`.
