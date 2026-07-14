import type { ModuleExplanation } from "./view-explanations-types";

/** Módulos del grupo secundario de navegación (operaciones, esquema, proveedores, seguridad, administración). */
export const secondaryModuleExplanations: ModuleExplanation[] = [
  {
    module: "Operaciones",
    prefixes: [
      "/internal/forms",
      "/internal/operations",
      "/internal/jobs",
      "/internal/alerts",
      "/internal/notifications",
      "/internal/my-notifications",
      "/internal/exports",
    ],
    systems:
      "Herramientas del día a día del equipo interno: cola de trabajo de casos, jobs programados del backend, alertas operativas, mensajería interna (broadcasts, plantillas y preferencias) y exportaciones de datos con trazabilidad.",
    business:
      "Concentra la operación diaria: qué casos hay que atender, qué procesos automáticos corrieron, qué avisos llegaron y cómo se comunica el equipo — todo auditable.",
    views: {
      "/internal/operations/work-queue": {
        systems:
          "Cola priorizada de casos operativos (revisión manual, fraude, compliance) servida por el backend según el rol del usuario.",
        business:
          "El 'inbox' del analista: qué caso atender ahora y con qué prioridad, sin planillas paralelas.",
      },
      "/internal/operations/customers": {
        systems:
          "Ficha 360 del cliente: identidad, sesiones, dispositivos, decisiones de riesgo y resumen de investigación agregados desde varios módulos del backend.",
        business:
          "Toda la historia de un cliente en una pantalla para resolver un caso sin saltar entre sistemas.",
      },
      "/internal/jobs": {
        systems:
          "Ejecuciones de jobs internos (`system_job_runs`): estado, duración, errores y reintentos.",
        business:
          "Visibilidad de los procesos automáticos que mueven el negocio (sincronizaciones, cierres); si uno falla, se ve aquí antes de que falten datos.",
      },
      "/internal/alerts": {
        systems:
          "Alertas operativas generadas por reglas del backend, con severidad, estado y asignación.",
        business:
          "Los avisos que requieren acción humana, separados del ruido, con responsable y seguimiento.",
      },
      "/internal/notifications": {
        systems:
          "Administración de mensajería: broadcasts a usuarios internos, plantillas versionadas y preferencias por canal.",
        business:
          "Cómo la plataforma comunica — desde un aviso de mantenimiento hasta la notificación de un incidente — con formato consistente.",
      },
      "/internal/my-notifications": {
        systems:
          "Bandeja personal alimentada por el mismo feed de la campana; marca leído por ítem o en bloque y se sincroniza con la salud de herramientas.",
        business:
          "El historial personal de avisos: qué me notificaron, cuándo, y qué sigue pendiente de atender.",
      },
      "/internal/exports": {
        systems:
          "Solicitudes de exportación con estado, alcance y descarga controlada; cada export queda auditado.",
        business:
          "Sacar datos de la plataforma de forma trazable: quién exportó qué y para qué, sin copias silenciosas.",
      },
      "/internal/forms": {
        systems:
          "Definiciones de formularios versionadas que consumen los flujos de captura del backend.",
        business:
          "Los formularios que ve el cliente, administrados y versionados para cambiar sin romper capturas históricas.",
      },
    },
  },
  {
    module: "Esquema de datos",
    prefixes: ["/internal/schema"],
    systems:
      "Versionado del esquema físico: snapshots de tablas/columnas (`schema_tables`, `schema_columns`), diffs entre versiones y change log con aprobaciones.",
    business:
      "Historia formal de cómo evolucionó la estructura de datos: qué cambió, quién lo aprobó y cuándo — clave para auditoría y para depurar problemas históricos.",
    views: {
      "/internal/schema/versions": {
        systems:
          "Snapshots de esquema versionados con comparación entre versiones.",
        business:
          "Permite responder 'cómo era la base cuando pasó X' sin arqueología de migraciones.",
      },
      "/internal/schema/change-log": {
        systems:
          "Bitácora de cambios de esquema con tipo de cambio, entidad afectada y notas de aprobación.",
        business:
          "Trazabilidad de cada cambio estructural con su justificación y aprobador.",
      },
      "/internal/schema/tables": {
        systems:
          "Detalle por tabla de la versión de esquema seleccionada: columnas, tipos y restricciones.",
        business:
          "La referencia exacta de qué guarda cada tabla en una versión dada.",
      },
    },
  },
  {
    module: "Proveedores externos",
    prefixes: ["/internal/external-providers"],
    systems:
      "Catálogo y salud de los proveedores externos (buró, SEGIP, telco, WhatsApp…), con políticas de costo, auditorías de consumo y solicitudes registradas request a request.",
    business:
      "Controla la relación con terceros: si responden, cuánto cuestan y qué se les consultó — para negociar contratos y detectar abusos o caídas.",
    views: {
      "/internal/external-providers/audits": {
        systems:
          "Auditorías de consumo por proveedor: volúmenes, latencias y errores agregados por período.",
        business:
          "Evidencia para conciliar facturas de proveedores y detectar desvíos de consumo.",
      },
      "/internal/external-providers/requests": {
        systems:
          "Registro request a request de las llamadas salientes con estado, latencia y escenario simulado si aplica.",
        business:
          "Trazabilidad fina: qué se le preguntó a un tercero sobre un cliente y qué respondió.",
      },
      "/internal/external-providers": {
        systems:
          "Estado vivo y configuración de cada proveedor, incluidas políticas de costo por operación.",
        business:
          "Semáforo de dependencias externas: si el buró está caído, el onboarding se ve afectado y aquí se confirma.",
      },
    },
  },
  {
    module: "Seguridad y auditoría",
    prefixes: ["/internal/security", "/internal/audit"],
    systems:
      "Sesión y controles de seguridad del usuario interno, más la terminal de auditoría que consulta los action logs del backend (Postgres y Mongo) por request, módulo y actor.",
    business:
      "Responde 'quién hizo qué y cuándo' con evidencia técnica completa — la base de cualquier investigación interna o requerimiento regulatorio.",
    views: {
      "/internal/audit/request": {
        systems:
          "Reconstrucción de un request puntual: cadena de logs correlacionados por requestId a través de módulos.",
        business:
          "Permite reconstruir un caso específico (una queja, un fraude) paso a paso con evidencia.",
      },
      "/internal/audit": {
        systems:
          "Explorador de action logs con filtros por módulo, actor, status y ventana temporal; incluye logs sincronizados desde Mongo.",
        business:
          "La bitácora completa de la plataforma para auditoría continua, no solo cuando hay un problema.",
      },
      "/internal/security/session": {
        systems:
          "Datos de la sesión actual (token, expiración, permisos efectivos) y acciones de cierre.",
        business:
          "Transparencia para el usuario interno sobre con qué identidad y permisos está operando.",
      },
    },
  },
  {
    module: "Administración",
    prefixes: ["/internal/settings"],
    systems:
      "RBAC interno (usuarios, roles, permisos granulares) y mantenimiento del catálogo: descubrimiento de endpoints, refresh de seeds e inferencia de herramientas e impactos.",
    business:
      "Define quién puede hacer qué dentro del portal y mantiene actualizado el inventario sobre el que operan todos los demás módulos.",
    views: {
      "/internal/settings/users": {
        systems:
          "CRUD de usuarios internos con asignación de roles y estado de la cuenta.",
        business:
          "Altas, bajas y cambios del equipo con permisos correctos desde el día uno.",
      },
      "/internal/settings/roles": {
        systems: "Roles internos y su mapa de permisos granulares.",
        business:
          "Plantillas de acceso por función (analista, auditor, admin) para no asignar permisos a mano.",
      },
      "/internal/settings/permissions": {
        systems:
          "Catálogo de permisos granulares que consumen los guards del backend y los gates del frontend.",
        business:
          "El vocabulario oficial de accesos: qué significa exactamente cada permiso.",
      },
      "/internal/settings/catalog-sync": {
        systems:
          "Dispara el escaneo de endpoints, el refresh del seed del catálogo y las inferencias de herramientas e impactos endpoint↔tabla (directos e indirectos vía FK).",
        business:
          "El botón de 'poner al día el inventario' después de un deploy del backend, para que catálogo, QA y gobierno trabajen sobre la realidad.",
      },
      "/internal/settings/profile": {
        systems: "Datos del perfil propio y cambio de contraseña.",
        business: "Autogestión básica de la cuenta sin pasar por un admin.",
      },
    },
  },
];
