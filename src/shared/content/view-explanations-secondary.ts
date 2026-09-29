import type { ModuleExplanation } from "./view-explanations-types";

/** Módulos del grupo secundario de navegación (esquema, proveedores, seguridad, administración; Operaciones vive aparte). */
export const secondaryModuleExplanations: ModuleExplanation[] = [
  {
    module: "Esquema de datos",
    prefixes: ["/internal/schema"],
    systems:
      "Versiones de la estructura de la base: copias de cómo eran las tablas y sus campos en cada momento, comparación entre versiones e historial de cambios con sus aprobaciones.",
    business:
      "Historia formal de cómo evolucionó la estructura de datos: qué cambió, quién lo aprobó y cuándo — clave para auditoría y para depurar problemas históricos.",
    views: {
      "/internal/schema/versions": {
        systems:
          "Versiones guardadas de la estructura de la base, con comparación entre ellas.",
        business:
          "Permite responder 'cómo era la base cuando pasó X' sin arqueología de migraciones.",
      },
      "/internal/schema/change-log": {
        systems:
          "Historial de cambios de la estructura con tipo de cambio, elemento afectado y notas de aprobación.",
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
      "Catálogo y salud de los proveedores externos (buró, SEGIP, telefonía, WhatsApp…), con políticas de costo, auditorías de consumo y cada consulta registrada una por una.",
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
          "Registro de cada llamada hecha a un proveedor, con su estado, tiempo de respuesta y escenario simulado si lo hubo.",
        business:
          "Trazabilidad fina: qué se le preguntó a un tercero sobre un cliente y qué respondió.",
      },
      "/internal/external-providers": {
        systems:
          "Estado en vivo y configuración de cada proveedor, incluidas las políticas de costo por operación. La ficha de cada proveedor muestra además el estado de su credencial.",
        business:
          "Semáforo de dependencias externas: si el buró está caído, el onboarding se ve afectado y aquí se confirma.",
      },
    },
  },
  {
    module: "Seguridad y auditoría",
    prefixes: ["/internal/security", "/internal/audit"],
    systems:
      "Sesión y controles de seguridad del usuario interno, y el registro del sistema, que permite consultar qué se hizo por solicitud, módulo y persona.",
    business:
      "Responde 'quién hizo qué y cuándo' con evidencia técnica completa — la base de cualquier investigación interna o requerimiento regulatorio.",
    views: {
      "/internal/audit/request": {
        systems:
          "Reconstruye una solicitud concreta: todos los registros que dejó a su paso por los distintos módulos, en orden.",
        business:
          "Permite reconstruir un caso específico (una queja, un fraude) paso a paso con evidencia.",
      },
      "/internal/audit": {
        systems:
          "Explorador del registro de acciones con filtros por método, riesgo, módulo, persona, datos personales, código, fechas y solicitud relacionada; incluye los registros del archivo de respaldo.",
        business:
          "La bitácora completa de la plataforma para auditoría continua, no solo cuando hay un problema.",
      },
      "/internal/security/session": {
        systems:
          "Datos de la sesión actual (vencimiento y permisos con los que estás operando) y opciones para cerrarla.",
        business:
          "Transparencia para el usuario interno sobre con qué identidad y permisos está operando.",
      },
    },
  },
  {
    module: "Administración",
    prefixes: ["/internal/settings"],
    systems:
      "Usuarios, roles y permisos internos, y mantenimiento del inventario del sistema: alta de operaciones nuevas, actualización de la lista base y detección de herramientas y efectos sobre tablas.",
    business:
      "Define quién puede hacer qué dentro del portal y mantiene actualizado el inventario sobre el que operan todos los demás módulos.",
    views: {
      "/internal/settings/decision-artifacts": {
        systems:
          "Decisiones que se delegan al motor de decisión. Cada fila dice qué artefacto la resuelve, qué versión se usa, qué operaciones de Atlas la piden y en qué momento del recorrido ocurre. Las opciones del selector las da el propio motor, así que no se puede asignar un código que no exista.",
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
          "Edita el TEXTO de cada documento de consentimiento, nunca su código ni su versión: esos los fija el sistema y esta pantalla ni siquiera los ofrece. La app móvil toma el título y el cuerpo de aquí, así que corregir una palabra no exige publicar una versión nueva de la app.",
        business:
          "Quien aceptó bajo la v1 tiene derecho a que la v1 siga diciendo lo que leyó. Aquí se corrige la redacción; un cambio de fondo se publica como versión nueva y vuelve a pedirse la aceptación.",
      },
      "/internal/settings/app-content": {
        systems:
          "Contenido por sección de la app: bienvenida, preguntas frecuentes, ayuda, inicio, legal, perfil y crédito. Crear y editar son lo mismo: cada pieza se identifica por sección, clave e idioma, así que volver a editarla la actualiza en vez de duplicarla. El número de WhatsApp se guarda como número local y el sistema le añade el prefijo del país.",
        business:
          "El eslogan, los pasos de bienvenida y las respuestas de ayuda estaban escritos en el código de la app: corregir una respuesta que confunde costaba dos publicaciones en tiendas y, hasta que cada persona actualizara, convivían dos versiones de lo que Atlas dice ser.",
      },
      "/internal/settings/notification-policies": {
        systems:
          "Define qué avisos existen, por qué canal salen y cuáles no se pueden desactivar. Esa marca se fija AQUÍ y no en la app: antes la app podía enviar que un aviso no era obligatorio y así silenciar el aviso de mora. Un aviso obligatorio no se puede guardar sin el motivo que la app muestra junto al candado.",
        business:
          "Un interruptor bloqueado sin explicación se lee como abuso; con el motivo delante, «no puedes apagarlo» se convierte en «no te conviene apagarlo, y por esto». Aquí se decide qué le llega al cliente y qué puede él silenciar.",
      },
      "/internal/settings/users": {
        systems:
          "Alta, edición y baja de usuarios internos, con sus roles y el estado de su cuenta.",
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
          "Lista de permisos que el sistema comprueba antes de dejar ver o hacer cada cosa en el portal.",
        business:
          "El vocabulario oficial de accesos: qué significa exactamente cada permiso.",
      },
      "/internal/settings/catalog-sync": {
        systems:
          "Busca las operaciones nuevas del sistema, actualiza la lista base del inventario y detecta qué herramientas usa cada operación y qué tablas toca (directa o indirectamente).",
        business:
          "El botón de «poner al día el inventario» después de cada actualización del sistema, para que catálogo, QA y gobierno trabajen sobre lo que existe de verdad.",
      },
      "/internal/settings/profile": {
        systems: "Datos del perfil propio y cambio de contraseña.",
        business: "Autogestión básica de la cuenta sin pasar por un admin.",
      },
    },
  },
];
