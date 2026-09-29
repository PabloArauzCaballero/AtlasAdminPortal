import type { ModuleExplanation } from "./view-explanations-types";

/** El módulo «Operaciones», aparte para que cada archivo de explicaciones quepa en 300 líneas. */
export const operationsModuleExplanation: ModuleExplanation = {
  module: "Operaciones",
  prefixes: [
    "/internal/operations",
    "/internal/jobs",
    "/internal/notifications",
    "/internal/my-notifications",
    "/internal/exports",
    "/internal/files",
    "/internal/support",
    "/internal/views",
    "/internal/merchant-users",
    "/internal/events",
  ],
  systems:
    "Herramientas del día a día del equipo interno: cola de trabajo, soporte, procesos automáticos, alertas, mensajería (avisos, plantillas y seguimiento de campañas), eventos entre procesos, comercios, cartera y exportaciones, todo con registro de quién hizo qué.",
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
        "Crea artículos y versiones nuevas, los envía a revisión, los aprueba y los publica. El sistema impide que el autor apruebe su propia versión y exige a Riesgo o Cumplimiento para los temas de crédito, riesgo, pagos, identidad, seguridad, privacidad y legal. Antes de cada paso se muestra la versión completa, y en una versión propia en revisión no aparece «Aprobar».",
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
        "Lista los medios de contacto (correo o teléfono) que siguen sin confirmar. El botón pide al sistema que genere y envíe un código nuevo, con una espera mínima entre envíos al mismo destino.",
      business:
        "Los usuarios de la app que se quedaron sin confirmar el correo o el teléfono, y un botón para reenviarles el código sin pedirles que vuelvan a empezar.",
    },
    "/internal/operations/payment-claims": {
      systems:
        "Lista de todos los avisos de pago, con comercio, cliente, préstamo, cuota y horas de espera. Es de consulta: quien confirma el pago es el comercio, desde su ERP.",
      business:
        "Los comprobantes que los clientes mandaron al pagar y que su comercio todavía no confirmó. Sirve para ver qué comercio deja avisos sin mirar más de 48 horas y llamarle, antes de que el cliente crea que su pago se perdió.",
    },
    "/internal/operations/work-queue": {
      systems:
        "La cola de trabajo, con pestañas para todos los casos, revisión manual y fraude, búsqueda por código de cliente o de caso, filtros de estado y prioridad y totales por tipo. Quien analiza fraude solo ve la pestaña de fraude. Las antiguas pantallas de revisión manual y de casos de fraude llevan aquí.",
      business:
        "El 'inbox' del analista: los casos de revisión manual y de fraude que esperan decisión, en una sola cola con una pestaña por tipo, sin planillas paralelas.",
    },
    "/internal/operations/manual-review-cases": {
      systems:
        "Dirección antigua: lleva a la pestaña de revisión manual de la cola de trabajo, con los mismos filtros.",
      business:
        "La revisión manual es ahora una pestaña de la «Cola de trabajo».",
    },
    "/internal/operations/fraud-cases": {
      systems:
        "Dirección antigua: lleva a la pestaña de fraude de la cola de trabajo, con los mismos filtros.",
      business:
        "Los casos de fraude son ahora una pestaña de la «Cola de trabajo».",
    },
    "/internal/files": {
      systems:
        "El expediente de cada persona, organizado en carpetas. Los permisos se heredan por carpeta y cada movimiento queda en una bitácora que no se puede borrar. Los archivos NUNCA quedan en una dirección pública: solo se abren con sesión y cada apertura queda registrada. Al subir un archivo, el sistema comprueba que llegó completo, su tamaño y su tipo antes de darlo por bueno. Los contactos y referencias no son archivos: se muestran a partir de los datos del cliente, ocultos salvo permiso para verlos.",
      business:
        "La carpeta de cada persona, ordenada sola: el carnet y la selfie en «auth», los extractos en «extractos», y lo que dejó el Motor donde corresponde. Al enviarse la solicitud el expediente se congela y se firma un manifiesto, de modo que meses después se puede demostrar qué había exactamente cuando se decidió. Quién puede verla no es «todo el equipo»: se hereda por carpeta y se amplía caso por caso, siempre con motivo.",
    },
    "/internal/operations/loans": {
      systems:
        "Cartera de préstamos con filtros de estado, tramo y código, y la ficha de cada préstamo (cronograma, cobros e historial) desde donde se registra un cobro (sin duplicarlo aunque se pulse dos veces), se revierte un cobro o se castiga la deuda, junto con su calificación y la escala vigente. El desembolso se hace desde la ficha del cliente.",
      business:
        "Lo que pasa después de aprobar: entregar el dinero, anotar lo que el cliente paga, deshacer un cobro mal aplicado y reconocer una deuda como pérdida — siempre con motivo y con tu usuario en el historial.",
    },
    // El matcher de vistas resuelve por prefijo (`startsWith`), así que las
    // subrutas con `customerId` dinámico (`/investigation-summary`, `/audit`)
    // no pueden tener clave propia y caen todas en esta entrada.
    "/internal/operations/customers": {
      systems:
        "Ficha completa del cliente: identidad, sesiones, dispositivos, decisiones de riesgo y resumen de investigación, reunidos desde varios módulos. La pestaña de Auditoría junta las 8 fuentes de auditoría en una sola línea de tiempo, y ofrece un segundo modo, más antiguo, con resumen por evento y filtros por tipo y fecha, pero con un total aproximado.",
      business:
        "Toda la historia de un cliente en una pantalla para resolver un caso sin saltar entre sistemas, incluida la auditoría completa: qué le pasó al cliente, cuándo y quién lo hizo — la evidencia que respalda una decisión de riesgo, fraude o compliance.",
    },
    "/internal/operations/risk-assessments": {
      systems:
        "Detalle de una evaluación de riesgo: la explicación legible (decisión, factores a favor y en contra, reglas que se cumplieron) y el detalle técnico completo con la puntuación por dimensión y el peso de cada variable. No tiene listado: se llega desde la investigación del cliente.",
      business:
        "Responde 'por qué el sistema decidió esto' con evidencia: el analista puede sostener, revertir o auditar una decisión de riesgo sin pedirle el desglose al equipo técnico.",
    },
    "/internal/operations/sessions": {
      systems:
        "Resumen de investigación de una sesión: la sesión, el cliente y el dispositivo, con todo lo registrado alrededor: estado del dispositivo, reputación de la conexión, SIM, inicios de sesión y permisos, GPS, acciones, observaciones y auditoría. Se llega desde un enlace: no hay listado de sesiones.",
      business:
        "Responde '¿esta sesión es legítima?' en una pantalla: si la conexión venía por VPN/proxy/Tor, si el teléfono estaba rooteado o era un emulador, cuántos logins fallaron y qué permisos se denegaron. Por privacidad nunca muestra la ubicación exacta, solo si hubo captura de GPS.",
    },
    "/internal/jobs": {
      systems:
        "Dos pestañas. «Historial»: cada ejecución con estado, duración, datos de entrada, resultado y error (solo consulta; una ejecución no se reintenta). «Ejecutar ahora» (solo administración): lanzar a mano los procesos de mantenimiento, que empiezan en modo ensayo y dejan su ejecución en el historial.",
      business:
        "Visibilidad de los procesos automáticos que mueven el negocio (sincronizaciones, cierres) y la palanca para destrabar la operación cuando algo se atasca, sin esperar a la ventana programada ni pedir un despliegue.",
    },
    "/internal/notifications": {
      systems:
        "Administración de mensajería: avisos a usuarios internos, plantillas con versiones y preferencias por canal.",
      business:
        "Cómo la plataforma comunica — desde un aviso de mantenimiento hasta la notificación de un incidente — con formato consistente.",
    },
    "/internal/my-notifications": {
      systems:
        "Bandeja personal con los mismos avisos de la campana; se marcan como leídos uno a uno o todos juntos, y se actualiza con el estado de las herramientas.",
      business:
        "El historial personal de avisos: qué me notificaron, cuándo, y qué sigue pendiente de atender.",
    },
    "/internal/exports": {
      systems:
        "Dirección retirada: lleva al catálogo de datos. Las descargas en JSON se hacen con el botón «Descargar JSON» de Endpoints, Catálogo de datos y Reglas de calidad, que baja el catálogo entero con la sesión de quien lo pulsa.",
      business:
        "Los catálogos se descargan desde la pantalla de cada uno; aquí no hay un historial de exportaciones.",
    },
  },
};
