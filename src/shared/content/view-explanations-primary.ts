import type { ModuleExplanation } from "./view-explanations-types";

/** Módulos del grupo primario de navegación (Systems Ops, catálogo, lineage, gobierno, reportes, QA). */
export const primaryModuleExplanations: ModuleExplanation[] = [
  {
    module: "Systems Ops",
    prefixes: ["/internal/systems", "/internal/review-queue"],
    systems:
      "Cataloga automáticamente los endpoints, herramientas y tablas de cada backend conectado (hoy atlas-backend, extensible a otros vía el campo backendService), infiere qué datos afecta cada endpoint escaneando el código fuente y monitorea la salud viva de las herramientas críticas con probes periódicos.",
    business:
      "Es el inventario operativo de la plataforma: permite saber qué existe, quién lo usa, qué rompe si falla y detectar incidentes antes de que un cliente los sufra. Sin este módulo, cada cambio o caída se descubriría a ciegas.",
    views: {
      "/internal/systems/dashboard": {
        systems:
          "Consolida `/systems/dashboard` (contadores del catálogo) y `/systems/health/tools` (salud viva) en una sola pantalla con refresco automático.",
        business:
          "Vista de un vistazo para el equipo de plataforma: si algo crítico está caído o el catálogo quedó desactualizado, se ve aquí primero.",
      },
      "/internal/systems/endpoints": {
        systems:
          "Lista paginada del catálogo `system_endpoint_catalog`, con método, ruta, backend de origen, riesgo, PII y estado de revisión. Los endpoints se descubren escaneando los controladores del backend.",
        business:
          "Inventario de todas las operaciones que expone la plataforma: qué acciones existen, cuáles tocan datos sensibles y cuáles requieren pruebas antes de un release.",
      },
      "/internal/systems/tools/health": {
        systems:
          "Estado vivo por herramienta (`isHealthy` de `/systems/health/tools`): probes reales a PostgreSQL/Redis y verificación de configuración para el resto. Es la misma señal que dispara las notificaciones de servicio caído/recuperado.",
        business:
          "Responde '¿está funcionando lo que la operación necesita ahora mismo?' — si el buró, WhatsApp o la base están caídos, aquí se confirma el incidente que avisó la campana.",
      },
      "/internal/systems/tools": {
        systems:
          "Catálogo de herramientas técnicas (`system_tool_catalog`): tipo, proveedor, variables de entorno requeridas y criticidad. No muestra secretos.",
        business:
          "Mapa de dependencias externas e internas: qué servicios de terceros usa la plataforma y cuáles son imprescindibles para operar.",
      },
      "/internal/review-queue": {
        systems:
          "Cola de ítems auto-detectados (endpoints, tablas, impactos, herramientas) con estado NEEDS_REVIEW; aprobar/rechazar actualiza `review_status` y registra el evento.",
        business:
          "Control humano sobre lo que detectan los escáneres automáticos: nada se da por confiable para QA, gobierno o reportes hasta que una persona lo valida.",
      },
    },
  },
  {
    module: "Catálogo y metadata",
    prefixes: [
      "/internal/data-catalog",
      "/internal/business-metadata",
      "/internal/operations/catalogs",
    ],
    systems:
      "Expone el catálogo de entidades de datos (`system_data_entity_catalog`), sus columnas, relaciones FK y los impactos endpoint↔tabla inferidos, junto con dominios, glosario y definiciones de negocio administradas en el backend.",
    business:
      "Es el diccionario común entre tecnología y negocio: qué significa cada tabla y cada término, quién es su dueño y qué procesos la afectan. Evita que cada equipo invente su propia definición de 'cliente' o 'riesgo'.",
    views: {
      "/internal/data-catalog/tables": {
        systems:
          "Lista las tablas catalogadas con módulo, dueño, flags de PII/financiero/riesgo y estado de revisión; el detalle muestra columnas, relaciones y los endpoints que la afectan directa o indirectamente.",
        business:
          "Permite a un auditor o analista saber qué datos existen, qué tan sensibles son y quién responde por ellos, sin leer código.",
      },
      "/internal/business-metadata/domains": {
        systems:
          "Dominios de negocio del catálogo (`system_domain_catalog`): definición, alcance técnico, tablas ejemplo y casos de decisión.",
        business:
          "Agrupa los datos por área de negocio (identidad, riesgo, pagos…) para que cada dominio tenga dueño y propósito claros.",
      },
      "/internal/business-metadata/glossary": {
        systems:
          "Términos de negocio versionados con su definición, sinónimos y vínculos a tablas/columnas del catálogo.",
        business:
          "Glosario único: cuando compliance, riesgo y producto hablan de 'onboarding aprobado', todos se refieren a lo mismo.",
      },
      "/internal/business-metadata/definitions": {
        systems:
          "Definiciones operativas administrables (catálogos de valores, reglas de interpretación) servidas por el backend con dueño y dominio.",
        business:
          "Documenta las convenciones operativas que no viven en código, para que un cambio de criterio quede registrado y comunicado.",
      },
      "/internal/operations/catalogs": {
        systems:
          "Catálogos operativos (listas de valores) que consumen los flujos del backend, con su versión y estado.",
        business:
          "Las listas que la operación usa a diario (motivos, estados, tipologías) administradas en un solo lugar y sin deploys.",
      },
    },
  },
  {
    module: "Lineage",
    prefixes: ["/internal/lineage"],
    systems:
      "Grafo de dependencias entre tablas construido desde el catálogo de relaciones FK (`system_data_relationship_catalog`) y los impactos endpoint↔tabla; permite navegar nodos y calcular impacto de cambios.",
    business:
      "Responde '¿si toco esto, qué se rompe?': antes de cambiar una tabla o un proceso, muestra qué reportes, decisiones y módulos dependen de ella.",
    views: {
      "/internal/lineage/official": {
        systems:
          "Vista curada del lineage con las relaciones aprobadas en revisión (no las inferidas pendientes).",
        business:
          "La versión confiable del mapa de dependencias, apta para auditoría y decisiones de arquitectura.",
      },
      "/internal/lineage/impact": {
        systems:
          "Cálculo de impacto transitivo: dado un nodo, recorre el grafo y lista todo lo afectado aguas abajo.",
        business:
          "Estimación rápida del radio de impacto de un cambio o incidente para planificar releases y comunicar riesgos.",
      },
      "/internal/lineage": {
        systems:
          "Explorador del grafo tabla↔tabla con filtros por esquema y módulo; cada nodo enlaza a su detalle de catálogo.",
        business:
          "Mapa navegable de cómo se conectan los datos de la plataforma, útil para entender flujos de punta a punta.",
      },
    },
  },
  {
    module: "Gobierno y calidad",
    prefixes: [
      "/internal/governance",
      "/internal/risk-policy",
      "/internal/data-quality",
    ],
    systems:
      "Administra políticas de gobierno (retención, PII, acceso), la política de riesgo vigente y las reglas/issues de calidad de datos que el backend evalúa sobre el catálogo.",
    business:
      "Garantiza que los datos se usen conforme a la regulación y con calidad suficiente para decidir: qué se puede guardar, por cuánto tiempo, quién lo ve y qué tan confiable es.",
    views: {
      "/internal/governance/policies": {
        systems:
          "CRUD de políticas con alcance por tablas/columnas, estados de publicación y configuración por política.",
        business:
          "Las reglas del juego sobre los datos, versionadas y auditables: qué política aplica a qué información.",
      },
      "/internal/governance/pii": {
        systems:
          "Inventario de columnas marcadas como PII en el catálogo, con su clasificación y las políticas que las cubren.",
        business:
          "Vista de cumplimiento: dónde vive el dato personal y cómo está protegido, lista para una inspección.",
      },
      "/internal/governance": {
        systems:
          "Resumen del estado de gobierno: cobertura de políticas, PII detectada y pendientes de clasificación.",
        business:
          "Semáforo general de cumplimiento de datos para dirección y compliance.",
      },
      "/internal/risk-policy/current": {
        systems:
          "Política de riesgo activa servida por el backend con sus umbrales y versión vigente.",
        business:
          "La configuración que decide aprobaciones/rechazos de riesgo hoy; consultarla evita discusiones sobre 'qué regla estaba activa'.",
      },
      "/internal/data-quality/issues": {
        systems:
          "Issues generados por la evaluación de reglas de calidad sobre las tablas del catálogo, con severidad y estado.",
        business:
          "Lista de problemas concretos de datos (nulos, duplicados, inconsistencias) priorizada para corregir antes de que contaminen decisiones.",
      },
      "/internal/data-quality/rules": {
        systems:
          "Definición de reglas de calidad (completitud, unicidad, rangos) asociadas a tablas/columnas y su historial de ejecución.",
        business:
          "El estándar de calidad acordado por dato: qué se considera aceptable y cómo se vigila automáticamente.",
      },
    },
  },
  {
    module: "Reportes",
    prefixes: ["/internal/reports", "/internal/release-readiness"],
    systems:
      "Reportes generados por el backend con snapshots versionados, más el tablero de readiness que agrega señales de QA, catálogo y revisión para evaluar un release.",
    business:
      "Convierte la telemetría técnica en material para decidir: estado de la plataforma, evidencia para auditoría y una respuesta objetiva a '¿podemos salir a producción?'.",
    views: {
      "/internal/reports/readiness": {
        systems:
          "Reporte de preparación que cruza cobertura del catálogo, resultados QA y pendientes de revisión.",
        business:
          "Checklist ejecutivo pre-release: qué falta y qué riesgo se asume si se sale igual.",
      },
      "/internal/reports": {
        systems:
          "Listado de reportes disponibles con sus snapshots históricos descargables.",
        business:
          "Biblioteca de evidencia: cada corte queda versionado para comparar evolución y sustentar decisiones pasadas.",
      },
      "/internal/release-readiness": {
        systems:
          "Panel en vivo del semáforo de release: señales de QA, revisión de catálogo y salud de herramientas.",
        business:
          "La foto actual de si la plataforma está lista para un despliegue sin sorpresas.",
      },
    },
  },
  {
    module: "QA",
    prefixes: ["/internal/qa"],
    systems:
      "Consola de pruebas contra el catálogo: laboratorio para invocar endpoints con payloads controlados, suites multi-paso con aserciones y extractores, historial de ejecuciones y perfiles de stress con allowlist/SSRF-guard.",
    business:
      "Permite verificar que la plataforma se comporta como se espera antes de exponer cambios a clientes, y deja evidencia auditable de cada prueba.",
    views: {
      "/internal/qa/lab": {
        systems:
          "Ejecución ad-hoc de un endpoint catalogado: arma la request desde el contrato (payload mínimo, headers, roles) y muestra la respuesta cruda.",
        business:
          "Reproducir un caso puntual en segundos — para soporte, debugging o validar un fix — sin herramientas externas.",
      },
      "/internal/qa/suites": {
        systems:
          "Suites multi-paso con extractores entre pasos y aserciones; se versionan y ejecutan contra ambientes permitidos.",
        business:
          "Los flujos críticos del negocio (onboarding, decisión, notificación) probados de punta a punta y repetibles.",
      },
      "/internal/qa/runs": {
        systems:
          "Historial de ejecuciones con resultado por paso, latencias y payloads sanitizados.",
        business:
          "Evidencia de qué se probó, cuándo y con qué resultado — la base del readiness de release.",
      },
      "/internal/qa/stress": {
        systems:
          "Perfiles de carga por endpoint (RPS, duración, ambiente) con ejecución controlada y aprobación previa.",
        business:
          "Confirma que los picos esperados (campañas, cierres) no van a tumbar la plataforma, antes de vivirlos en producción.",
      },
    },
  },
];
