import type { ModuleExplanation } from "./view-explanations-types";

/** «Systems Ops» con sus flujos, aparte para que cada archivo de explicaciones quepa en 300 líneas. */
export const systemsOpsModuleExplanation: ModuleExplanation = {
  module: "Systems Ops",
  prefixes: ["/internal/systems", "/internal/review-queue", "/internal/flows"],
  systems:
    "Cataloga automáticamente los endpoints, herramientas y tablas de cada backend conectado (hoy atlas-backend, extensible a otros vía el campo backendService), infiere qué datos afecta cada endpoint escaneando el código fuente y monitorea la salud viva de las herramientas críticas con probes periódicos.",
  business:
    "Es el inventario operativo de la plataforma: permite saber qué existe, quién lo usa, qué rompe si falla y detectar incidentes antes de que un cliente los sufra. Sin este módulo, cada cambio o caída se descubriría a ciegas.",
  views: {
    "/internal/flows/gate": {
      systems:
        "Las condiciones que deben cumplirse antes de dar la documentación por certificada: flujos críticos verificados sobre su código actual, sin escrituras desprotegidas ni deriva de permisos grave, revisión sin pendientes de riesgo alto y el análisis de cada bloque cargado.",
      business:
        "Un semáforo de «¿podemos firmar que esto está documentado y controlado?» antes de una auditoría o un pase a producción. No arregla lo que falta: señala qué es y dónde mirarlo.",
    },
    "/internal/flows/graph": {
      systems:
        "El dibujo de un flujo o de un módulo entero: quién lo usa, qué operación llama, qué autorización pide, qué lógica recorre y qué tablas toca, con sus ramas de error. Lo que el análisis no puede asegurar se dibuja punteado y con el motivo.",
      business:
        "Entender qué pasa por dentro cuando alguien hace algo en la plataforma, y qué más se ve afectado si eso cambia o falla. Es un mapa: abrirlo nunca ejecuta nada.",
    },
    "/internal/flows/pending-work": {
      systems:
        "Lo que cada flujo deja encargado para después al responder (eventos pendientes), si algún proceso lo recoge y qué eventos terminan de verdad en un aviso a alguien.",
      business:
        "Encontrar promesas que nadie cumple: por ejemplo, un evento de «pago recibido» que se publica y ningún proceso convierte en aviso al cliente. No reintenta ni corrige nada; para eso está «Eventos de dominio».",
    },
    "/internal/flows/rbac-drift": {
      systems:
        "Pantallas cuyo menú exige un permiso que las operaciones que llaman no comprueban. Sólo «Sin guarda» es una avería real; «Sólo rol» y «Pública» son casos a conversar.",
      business:
        "Detectar dónde el menú esconde algo que en realidad cualquiera podría usar, antes de que lo descubra alguien de afuera. No cambia permisos: eso se hace en Administración y en el código.",
    },
    "/internal/flows/review": {
      systems:
        "Los flujos de riesgo alto cuyo análisis automático no basta y los ya aprobados cuyo código cambió desde entonces. Aprobar un flujo es aprobar ESE código: si cambia, vuelve a esta cola.",
      business:
        "El control humano sobre los flujos que pueden mover dinero o datos sensibles. No es la revisión del catálogo (esa está en «Revisión del catálogo») ni aprueba créditos ni clientes.",
    },
    "/internal/flows": {
      systems:
        "El mapa de rutas derivado del código: una fila por operación, con qué puede hacer cada tipo de usuario, con qué autorización, y qué le falta (contrato, pruebas, quién lo llama). Se regenera desde el análisis del código; abrir una ficha nunca ejecuta la operación. Los procesos de negocio que usan estas operaciones se ven en «Procesos».",
      business:
        "Responder «¿quién puede hacer qué y está protegido?» sin leer código. No es un registro de lo que pasó: para eso están la auditoría y los eventos.",
    },
    "/internal/systems/endpoints": {
      systems:
        "Lista paginada del catálogo `system_endpoint_catalog`, con bloque, método, ruta, riesgo, PII y estado de revisión. Las rutas de este backend se descubren escaneando sus controladores; las del motor de decisión y el ERP llegan del manifiesto que cada uno publica sobre sí mismo.",
      business:
        "Inventario de todas las operaciones que expone el ECOSISTEMA, no sólo este backend: qué acciones existen en cada producto, cuáles tocan datos sensibles y cuáles requieren pruebas antes de un release.",
    },
    "/internal/systems/network-health": {
      systems:
        "Cruza `/systems/health/network`: el probe vivo de cada bloque del ecosistema (Atlas Backend, Decision Engine, ERP) con el estado de la federación de su catálogo. Un bloque federa publicando su propio manifiesto de rutas y tablas; esta vista dice si eso ocurrió, cuándo y con qué resultado.",
      business:
        "Responde '¿está completo el ecosistema?', que no es lo mismo que '¿responde cada pieza?'. Un bloque en pie que lleva días sin aportar su catálogo se veía antes igual que uno sano, y por eso el catálogo de datos parecía completo cuando sólo contenía un producto de tres.",
    },
    "/internal/systems/decision-engine/artifacts": {
      systems:
        "Cruza `/v1/deployments?status=ACTIVE` con `/v1/artifacts` del motor de decisión a través de `/systems/decision-engine/artifacts`: cada fila es un despliegue vigente con su versión, ambiente, autor y reparto de tráfico.",
      business:
        "Contesta desde el portal '¿qué política está decidiendo crédito ahora mismo?', que es la primera pregunta de cualquier investigación sobre una aprobación o un rechazo. Antes había que entrar al motor, con otra sesión y otro producto.",
    },
    "/internal/systems/tools": {
      systems:
        "Dos pestañas. «Catálogo»: las herramientas técnicas (`system_tool_catalog`) con tipo, proveedor, variables de entorno requeridas y criticidad, paginadas y con buscador por código, nombre, proveedor o tipo; no muestra secretos. «Salud» (permiso de salud de herramientas): el estado vivo de cada una, la misma señal que dispara los avisos de servicio caído.",
      business:
        "Mapa de dependencias externas e internas: qué servicios de terceros usa la plataforma, cuáles son imprescindibles y si ahora mismo responden. Si el buró, WhatsApp o la base están caídos, en «Salud» se confirma el incidente que avisó la campana.",
    },
    "/internal/review-queue": {
      systems:
        "Seis familias de detecciones automáticas (rutas, tablas, columnas, impactos en tablas y campos, y herramientas), cada una paginada por su cuenta. El buscador busca en todas: en impactos y herramientas, por la ruta, la tabla o la herramienta a la que apuntan. Aprobar o rechazar actualiza el estado de revisión y guarda el motivo.",
      business:
        "Control humano sobre lo que detectan los escáneres automáticos: nada se da por confiable para QA, gobierno o reportes hasta que una persona lo valida.",
    },
  },
};

/** La portada del portal. `exact`: su prefijo es la raíz y no debe apropiarse de ninguna otra ruta. */
export const homeModuleExplanation: ModuleExplanation = {
  module: "Inicio",
  prefixes: ["/internal"],
  exact: true,
  systems:
    "El panel de entrada: reúne en tarjetas el estado de los sistemas, del catálogo, de las pruebas, del gobierno de datos, del linaje y de la auditoría, cada una con enlace a su sección. Quien tiene permiso de salud de herramientas ve además, arriba y en rojo, las herramientas críticas caídas.",
  business:
    "Saber en un minuto si hay algo caído, pendiente de revisar o desactualizado antes de ponerse a trabajar.",
  views: {
    "/internal": {
      systems:
        "Contadores y semáforos leídos en vivo de cada sección; nada se calcula aparte ni se guarda aquí.",
      business:
        "Es un resumen para orientarse, no un lugar donde operar: cualquier acción se hace en la sección a la que lleva cada tarjeta.",
    },
  },
};

export const searchModuleExplanation: ModuleExplanation = {
  module: "Búsqueda",
  prefixes: ["/internal/search"],
  systems:
    "Busca en el índice oficial del portal: las operaciones catalogadas de la plataforma, las tablas de datos, las reglas de calidad y los reportes.",
  business:
    "Llegar rápido a una ficha cuando se sabe qué se busca pero no en qué sección está.",
  views: {
    "/internal/search": {
      systems:
        "Consulta el índice y devuelve cada resultado con su tipo y un enlace a su ficha. No recorre las secciones una por una ni hace cálculos pesados en el navegador.",
      business:
        "Un atajo de navegación para el catálogo: no busca clientes ni casos (eso se hace en su ficha o en su bandeja) y no encuentra lo que todavía no está indexado.",
    },
  },
};
