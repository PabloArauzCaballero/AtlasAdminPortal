# Tutoriales interactivos de QA LAB

Sistema de tutoriales **data-driven, reactivo y persistido en backend** que
convierte QA LAB en una plataforma autodescriptiva para usuarios técnicos y no
técnicos.

## Índice

1. [Auditoría de herramientas](01-auditoria-herramientas.md) — inventario real y matriz.
2. [Entregables e implementación](02-entregables-e-implementacion.md) — arquitectura, componentes, `data-tutorial-id`, endpoints, archivos.
3. [Catálogos](03-catalogos.md) — tutoriales, tooltips y errores.
4. [Pruebas y evidencias](04-pruebas-y-evidencias.md) — resultados vitest + E2E.
5. [Matriz de cumplimiento](05-matriz-cumplimiento.md) — criterios y entregables.
6. [Limitaciones](06-limitaciones.md) — qué no existe y decisiones tomadas.

## En 30 segundos

- **Motor**: `src/features/qa-tutorials/` — máquina de estados pura + runtime DOM
  reactivo + overlay de spotlight. Añadir un tutorial = añadir datos.
- **Acceso**: botón «Tutorial» (con estado) en cada sección + **Centro de
  aprendizaje** en `/internal/qa/aprender` + ítem en el menú lateral.
- **Reactividad**: los pasos esperan la acción real (clic, aparición de
  elemento, input, cambio de ruta) y resaltan el elemento por `data-tutorial-id`.
- **Persistencia**: `/api/qa-tutorials/progress` (backend, fuente de verdad) +
  caché de navegador.
- **Pruebas**: 43 unit/integración (incluye flujo completo con reactividad y
  persistencia) + E2E Playwright.

## Probar

```bash
npm test -- tests/unit/features/qa-tutorials
```

Abrir en el portal: **QA → Centro de aprendizaje** o el botón «Tutorial» del lab.
