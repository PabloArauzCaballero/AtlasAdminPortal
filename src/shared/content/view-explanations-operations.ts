import type { ModuleExplanation } from "./view-explanations-types";

/** El módulo «Operaciones», aparte para que cada archivo de explicaciones quepa en 300 líneas. */
export const operationsModuleExplanation: ModuleExplanation = {
  module: "Operaciones",
  prefixes: [
    "/internal/operations",
    "/internal/jobs",
    "/internal/notifications",
    "/internal/my-notifications",
    "/internal/files",
    "/internal/support",
    "/internal/views",
    "/internal/merchant-users",
    "/internal/events",
  ],
  systems:
    "Herramientas del día a día del equipo interno: cola de trabajo, soporte, jobs programados, alertas, mensajería (avisos, plantillas y seguimiento de campañas), eventos entre procesos, comercios, cartera y exportaciones, todo con trazabilidad.",
  business:
    "Concentra la operación diaria: qué casos hay que atender, qué procesos automáticos corrieron, qué avisos llegaron y cómo se comunica el equipo — todo auditable.",
  views: {
    "/internal/notifications/campaigns": {
      systems:
        "Lista las campañas de avisos masivos con su estado, canales, audiencia y ventana, y abre la ficha de cada una con el avance del reparto por canal y los avisos uno a uno. Se refresca sola mientras una campaña está enviando. Pausar, reanudar y cancelar sólo aparecen para administración y sólo cuando el estado lo admite; cancelar pide un motivo.",
      business:
        "Seguir y, si hace falta, frenar lo que se le está mandando a los clientes: una campaña con un error en el texto o que sale a la audiencia equivocada se pausa o se cancela desde aquí. No crea, no edita, no programa ni duplica campañas, ni hace envíos de prueba: todo eso se hace en el ERP, que es donde nacen.",
    },
    "/internal/support/knowledge": {
      systems:
        "Crea artículos y versiones con POST /admin/support/knowledge/articles y /articles/:id/versions, y las mueve con /versions/:id/submit-review, /approve y /publish. El servidor impide que el autor apruebe su propia versión y exige riesgo o cumplimiento para los equipos de crédito, riesgo, pagos, identidad, seguridad, privacidad y legal. La lista de artículos (GET /articles, cualquier estado y audiencia) y la cola de versiones por estado (GET /versions) son lecturas del personal; antes de cada paso se lee la versión completa con GET /versions/:id, y la versión propia en revisión no ofrece «Aprobar».",
      business:
        "Las respuestas oficiales que ven clientes, comercios y el equipo. Se redactan, las revisa y aprueba otra persona, y sólo entonces se publican; lo publicado no se edita, se reemplaza por otra versión y queda la historia de qué decía cada día.",
    },
    "/internal/support/agents": {
      systems:
        "Quién tiene perfil de agente en la mesa de soporte, con su nivel, cola y capacidad. Sin ese perfil nadie puede atender casos, ni siquiera un administrador. Dar de baja apaga el perfil y conserva su historia.",
      business:
        "Decidir quién atiende a clientes y comercios y cuánta carga lleva cada uno. No es la lista de usuarios internos: tener acceso al portal no convierte a nadie en agente.",
    },
    "/internal/support/cases": {
      systems:
        "La ficha de un caso de soporte: estado interno y lo que ve el cliente, prioridad, conversación, historia de lo que pasó y las acciones para atenderlo, resolverlo con un código de motivo y cerrarlo.",
      business:
        "Atender un caso concreto de principio a fin con toda su historia a la vista. Los casos restringidos sólo los abre un supervisor o el agente asignado.",
    },
    "/internal/support": {
      systems:
        "La bandeja de casos que abren clientes y comercios desde la app y el portal del comercio, con filtros por estado, prioridad y cola. Para trabajar en ella hace falta, además del rol interno, un perfil de agente habilitado.",
      business:
        "El punto de entrada de soporte: qué casos hay, cuáles urgen y quién los tiene. No reemplaza a la cola de trabajo de riesgo ni a las revisiones de identidad: esos casos viven en sus propias pantallas.",
    },
    "/internal/views": {
      systems:
        "Consultas de sólo lectura sobre las vistas publicadas del negocio (clientes, riesgo, cola operativa, proveedores, avisos, operaciones expuestas y auditoría), con paginación, campos elegidos y filtros declarados. Nunca toca las tablas de origen.",
      business:
        "Responder una pregunta puntual sobre los datos sin pedir una consulta a sistemas ni entrar a la base. No sirve para cambiar nada, ni reemplaza a los reportes ni a los tableros.",
    },
    "/internal/merchant-users": {
      systems:
        "Las peticiones de acceso que manda el ERP para las personas de un comercio, y los accesos ya concedidos. Aprobar crea la identidad con los datos del ERP tal cual; rechazar exige un motivo que vuelve al ERP.",
      business:
        "Conceder o negar el ingreso de la gente de un comercio a sus herramientas. Aquí no se corrigen nombres ni correos (se corrigen en el ERP y se vuelve a pedir) y ningún comercio entra a esta pantalla.",
    },
    "/internal/operations/partners": {
      systems:
        "La cola de expedientes de comercio que esperan decisión, del más antiguo al más nuevo, con el veredicto del Motor y su caso de revisión si lo abrió. Debajo, la cola de códigos QR de cobro por revisar.",
      business:
        "Terminar la verificación de un comercio cuando hizo falta criterio humano, y aprobar el QR con el que va a cobrar. La comisión no se fija aquí: es un término comercial que se lleva en el ERP.",
    },
    "/internal/operations/portfolio": {
      systems:
        "La categoría de riesgo y la previsión de cada deuda según la política vigente. La calificación corre sola cada seis horas; el botón la adelanta. También dice si la entrega de desenlaces al Motor va al día.",
      business:
        "Saber cuánto hay que provisionar por la cartera y anticiparse a un cierre contable. No mide el acierto del Motor (eso se hace en el Motor) ni cambia la política de calificación.",
    },
    "/internal/events": {
      systems:
        "Los eventos que publica cada parte de la plataforma cuando algo pasa (un alta, un pago, una decisión): cuáles se procesaron, cuáles fallaron y cuáles siguen esperando. Reintentar o cancelar un evento queda registrado con quién lo hizo.",
      business:
        "Destrabar lo que quedó a medias entre dos procesos, por ejemplo un pago registrado cuyo aviso nunca salió. No sirve para inventar eventos que no ocurrieron ni para corregir datos del cliente.",
    },
    "/internal/operations/pending-contacts": {
      systems:
        "Lista de `customer_contact_methods` con status `unverified` (GET /operations/customers/pending-contact-verification). El botón dispara POST /customer-onboarding/:id/contact-verification/request con rol interno: el backend genera y manda el código, con cooldown por destino.",
      business:
        "Los usuarios de la app que se quedaron sin confirmar el correo o el teléfono, y un botón para reenviarles el código sin pedirles que vuelvan a empezar.",
    },
    "/internal/operations/payment-claims": {
      systems:
        "Lista paginada de `credit.loan_payment_claims` de todo el tenant (GET /operations/payment-claims) con comercio, cliente, préstamo, cuota y horas de espera. Sólo lectura: la verificación es `POST /merchant/partners/:id/payment-claims/:claimId/verification`, que llama el ERP del comercio.",
      business:
        "Los comprobantes que los clientes mandaron al pagar y que su comercio todavía no confirmó. Sirve para ver qué comercio deja avisos sin mirar más de 48 horas y llamarle, antes de que el cliente crea que su pago se perdió.",
    },
    "/internal/operations/work-queue": {
      systems:
        "GET /operations/work-queue con `queue` (all / manual_review / fraud, pestaña `?cola=`), `q` (código de cliente o de caso), estado y prioridad, paginado en el servidor y con `summary.byType` para las cifras. `fraud_analyst` sólo entra con `queue=fraud`. Las rutas /internal/operations/manual-review-cases y /fraud-cases redirigen aquí.",
      business:
        "El 'inbox' del analista: los casos de revisión manual y de fraude que esperan decisión, en una sola cola con una pestaña por tipo, sin planillas paralelas.",
    },
    "/internal/operations/manual-review-cases": {
      systems:
        "Ruta antigua: redirige a /internal/operations/work-queue?cola=manual_review conservando sus parámetros.",
      business:
        "La revisión manual es ahora una pestaña de la «Cola de trabajo».",
    },
    "/internal/operations/fraud-cases": {
      systems:
        "Ruta antigua: redirige a /internal/operations/work-queue?cola=fraud conservando sus parámetros.",
      business:
        "Los casos de fraude son ahora una pestaña de la «Cola de trabajo».",
    },
    "/internal/files": {
      systems:
        "Expediente por sujeto sobre MinIO/S3: un árbol de carpetas con ruta materializada, concesiones heredadas por carpeta y bitácora append-only. Los archivos NUNCA se sirven por URL pública — el contenido pasa por la API autenticada y cada apertura queda registrada. Las subidas van por ticket firmado y el backend verifica hash, tamaño y tipo antes de dar el archivo por bueno. Los contactos y referencias no son un archivo: se componen desde la base al abrirlos, enmascarados salvo permiso de revelado.",
      business:
        "La carpeta de cada persona, ordenada sola: el carnet y la selfie en «auth», los extractos en «extractos», y lo que dejó el Motor donde corresponde. Al enviarse la solicitud el expediente se congela y se firma un manifiesto, de modo que meses después se puede demostrar qué había exactamente cuando se decidió. Quién puede verla no es «todo el equipo»: se hereda por carpeta y se amplía caso por caso, siempre con motivo.",
    },
    "/internal/operations/loans": {
      systems:
        "Cartera paginada con filtros de estado, tramo y código (GET /operations/loans) y ficha del préstamo (GET /loans/:id: cronograma, cobros e historial) con cobro (POST /loans/:id/payments, idempotente), reverso (…/payments/:id/reversal) y castigo (…/write-off), más su calificación y la escala vigente (GET /operations/rating-scale). El desembolso (POST /credit-applications/:id/disbursement) se lanza desde la ficha del cliente.",
      business:
        "Lo que pasa después de aprobar: entregar el dinero, anotar lo que el cliente paga, deshacer un cobro mal aplicado y reconocer una deuda como pérdida — siempre con motivo y con tu usuario en el historial.",
    },
    // El matcher de vistas resuelve por prefijo (`startsWith`), así que las
    // subrutas con `customerId` dinámico (`/investigation-summary`, `/audit`)
    // no pueden tener clave propia y caen todas en esta entrada.
    "/internal/operations/customers": {
      systems:
        "Ficha 360 del cliente: identidad, sesiones, dispositivos, decisiones de riesgo y resumen de investigación agregados desde varios módulos del backend. La pestaña de Auditoría lee `/operations/audit/customer/:id/feed` — paginado por cursor real sobre la vista `audit_event_feed`, que unifica las 8 fuentes de auditoría — y ofrece como modo secundario la ruta `/operations/audit/customer/:id`, deprecada en el backend, que aporta un resumen por evento y filtros por tipo y fecha a cambio de un conteo aproximado.",
      business:
        "Toda la historia de un cliente en una pantalla para resolver un caso sin saltar entre sistemas, incluida la auditoría completa: qué le pasó al cliente, cuándo y quién lo hizo — la evidencia que respalda una decisión de riesgo, fraude o compliance.",
    },
    "/internal/operations/risk-assessments": {
      systems:
        "Detalle de una evaluación de riesgo por `riskAssessmentRunId`: explicación legible (decisión, factores a favor/en contra, reglas disparadas) más la traza cruda — corrida, resultado con scores por dimensión, contribuciones de features y snapshot. No tiene listado: se llega por enlace desde la investigación del cliente.",
      business:
        "Responde 'por qué el sistema decidió esto' con evidencia: el analista puede sostener, revertir o auditar una decisión de riesgo sin pedirle el desglose al equipo técnico.",
    },
    "/internal/operations/sessions": {
      systems:
        "Resumen de investigación de una sesión (`OperationsSessionsController`): sesión, cliente y dispositivo, más la telemetría asociada — snapshots del dispositivo, reputación de IP, SIM, eventos de autenticación y permisos, GPS, acciones, observaciones y auditoría. Enlace directo por sessionId: no hay listado de sesiones.",
      business:
        "Responde '¿esta sesión es legítima?' en una pantalla: si la conexión venía por VPN/proxy/Tor, si el teléfono estaba rooteado o era un emulador, cuántos logins fallaron y qué permisos se denegaron. Por privacidad nunca muestra la ubicación exacta, solo si hubo captura de GPS.",
    },
    "/internal/jobs": {
      systems:
        "Dos pestañas sobre `system_job_runs`. «Historial»: cada corrida con estado, duración, entrada, resultado y error (de lectura; una corrida no se reintenta). «Ejecutar ahora» (sólo admin, platform_admin y system): disparo manual de los procesos de mantenimiento, que arrancan en ensayo y dejan su corrida en el historial.",
      business:
        "Visibilidad de los procesos automáticos que mueven el negocio (sincronizaciones, cierres) y la palanca para destrabar la operación cuando algo se atasca, sin esperar a la ventana programada ni pedir un despliegue.",
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
  },
};
