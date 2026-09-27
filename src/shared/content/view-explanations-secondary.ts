import type { ModuleExplanation } from "./view-explanations-types";

/** Módulos del grupo secundario de navegación (esquema, proveedores, seguridad, administración; Operaciones vive aparte). */
export const secondaryModuleExplanations: ModuleExplanation[] = [
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
    prefixes: ["/internal/external-providers", "/internal/external-data"],
    systems:
      "Catálogo y salud de los proveedores externos (buró, SEGIP, telco, WhatsApp…), con políticas de costo, auditorías de consumo y solicitudes registradas request a request.",
    business:
      "Controla la relación con terceros: si responden, cuánto cuestan y qué se les consultó — para negociar contratos y detectar abusos o caídas.",
    views: {
      "/internal/external-data": {
        systems:
          "Para un cliente concreto: qué consentimientos dio, qué se le consultó a cada proveedor, qué se obtuvo y con qué evidencia se decidió, en el orden real del proceso. Incluye una vista previa del costo antes de pedir una consulta nueva.",
        business:
          "Responder a un cliente o a un auditor «qué sabemos de esta persona por terceros y con qué permiso». Sin consentimiento no se consulta. Los costos, cortes y acuerdos de servicio de cada proveedor no están aquí sino en «Proveedores externos».",
      },
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
      "/internal/settings/decision-artifacts": {
        systems:
          "Catálogo de decisiones delegadas al Decision Engine. Cada fila declara qué artefacto la resuelve, qué versión se ejecuta, qué endpoints del backend la disparan y en qué punto del recorrido ocurre. Las opciones del selector las publica el propio motor (GET /v1/artifacts), así que no se puede asignar un código que no exista.",
        business:
          "Cambiar la política que evalúa un crédito o una identidad deja de ser un despliegue: lo decide Riesgo desde aquí. Por ejemplo, si Riesgo publica una versión nueva del scoring BNPL, esta pantalla es donde se decide si entra en producción o se sigue con la anterior — y donde se ve, sin abrir el código, qué se rompe si se cambia.",
      },
      "/internal/settings/partner-contracts": {
        systems:
          "El contrato de afiliación estándar para comercios, publicado por versiones: al publicar una nueva, la anterior se archiva y se conserva tal cual.",
        business:
          "El texto bajo el que opera un comercio al que nadie le negoció un contrato propio, para no habilitar a cobrar a alguien sin comisión, plazos ni devoluciones pactados por escrito. Un contrato negociado con un comercio concreto no se fija aquí: se lleva en el ERP.",
      },
      "/internal/settings/consent-documents": {
        systems:
          "Edita el TEXTO de cada documento de consentimiento (`/operations/consent-documents`), nunca su código ni su versión: el backend lo impone y esta pantalla ni siquiera ofrece esos campos. La app móvil lee el título y el cuerpo del servidor, así que corregir una palabra no exige compilar ni publicar en las tiendas.",
        business:
          "Quien aceptó bajo la v1 tiene derecho a que la v1 siga diciendo lo que leyó. Aquí se corrige la redacción; un cambio de fondo se publica como versión nueva y vuelve a pedirse la aceptación.",
      },
      "/internal/settings/app-content": {
        systems:
          "Contenido por superficie (`/operations/app-content`): bienvenida, preguntas frecuentes, ayuda, inicio, legal, perfil y crédito. Crear y editar son la misma operación, resuelta por superficie + clave + idioma, así que reeditar una pieza la actualiza en vez de duplicarla. El botón de WhatsApp se guarda como número local y el servidor le añade el prefijo del país.",
        business:
          "El eslogan, los pasos de bienvenida y las respuestas de ayuda estaban escritos en el código de la app: corregir una respuesta que confunde costaba dos publicaciones en tiendas y, hasta que cada persona actualizara, convivían dos versiones de lo que Atlas dice ser.",
      },
      "/internal/settings/notification-policies": {
        systems:
          "Declara qué avisos existen, por qué canal salen y cuáles son irrenunciables (`/operations/notification-policies`). El flag de irrenunciable se fija AQUÍ, del lado del servidor: antes llegaba en la petición del cliente y bastaba mandarlo en `false` para silenciar el aviso de mora. Un aviso irrenunciable no puede guardarse sin el motivo que la app enseña junto al candado.",
        business:
          "Un interruptor bloqueado sin explicación se lee como abuso; con el motivo delante, «no puedes apagarlo» se convierte en «no te conviene apagarlo, y por esto». Aquí se decide qué le llega al cliente y qué puede él silenciar.",
      },
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
