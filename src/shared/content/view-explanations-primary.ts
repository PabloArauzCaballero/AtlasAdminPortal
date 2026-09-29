import type { ModuleExplanation } from "./view-explanations-types";

/** Módulos del grupo primario de navegación (catálogo, lineage, gobierno, reportes, QA; Systems Ops vive aparte). */
export const primaryModuleExplanations: ModuleExplanation[] = [
  {
    module: "Catálogo y metadatos",
    prefixes: [
      "/internal/data-catalog",
      "/internal/business-metadata",
      "/internal/operations/catalogs",
    ],
    systems:
      "Reúne el inventario de tablas de datos, sus campos y cómo se relacionan entre sí, qué operaciones del sistema leen o escriben cada una, y el glosario de dominios, términos y definiciones de negocio.",
    business:
      "Es el diccionario común entre tecnología y negocio: qué significa cada tabla y cada término, quién es su dueño y qué procesos la afectan. Evita que cada equipo invente su propia definición de 'cliente' o 'riesgo'.",
    views: {
      "/internal/data-catalog/tables": {
        systems:
          "Lista las tablas de los tres bloques de Atlas (núcleo, motor de decisión y ERP) con su módulo, responsable, si guardan datos personales, financieros o de riesgo, y si ya se revisaron. El detalle muestra sus campos, sus relaciones y las operaciones que la tocan de forma directa o indirecta.",
        business:
          "Permite a un auditor o analista saber qué datos existen, qué tan sensibles son y quién responde por ellos, sin leer código.",
      },
      "/internal/business-metadata/domains": {
        systems:
          "Dos pestañas. «Dominios»: el mapa por área de negocio, contado sobre el inventario completo (tablas, operaciones, pruebas, datos personales y pendientes de cada dominio). «Términos»: el glosario de dominios, tablas y campos, con búsqueda por texto, tipo y dominio.",
        business:
          "Agrupa los datos por área de negocio con dueño y propósito, y fija qué significa cada tabla y cada campo para que producto, riesgo y soporte hablen de lo mismo.",
      },
      "/internal/business-metadata/glossary": {
        systems:
          "Ficha de un término del glosario: las tablas, campos y operaciones relacionadas, y las relaciones y restricciones reales que tiene en la base. La lista general del glosario está en la pestaña «Términos» de «Dominios y glosario».",
        business:
          "Qué significa un dato concreto, de qué tabla sale y quién lo usa, para decidir sin interpretarlo a ojo.",
      },
      "/internal/business-metadata/definitions": {
        systems:
          "Vocabulario del motor de decisión: eventos, observaciones, atributos y variables calculadas, con búsqueda por código o nombre y totales por tipo. No es el glosario de negocio.",
        business:
          "Qué señales puede usar el motor para decidir y qué significa cada una: antes de que una regla o un modelo use un dato, tiene que estar definido aquí.",
      },
      "/internal/operations/catalogs": {
        systems:
          "Listas de valores que usan los procesos de Atlas, con su versión y estado. El listado muestra la versión más reciente de cada lista (no solo la publicada) y desde ahí se entra a su ficha: valores, alias, efecto en el riesgo y el ciclo de aprobación (borrador, envío a aprobación, decisión de un administrador, publicación o retiro). Cada paso pide una justificación escrita que queda en la auditoría. También permite cargar valores sin revisar, aunque todavía no hay una pantalla para revisarlos después.",
        business:
          "Las listas que la operación usa a diario (motivos, estados, tipologías) administradas en un solo lugar y sin deploys, con control de cambios real: nadie cambia lo que las reglas leen en producción sin que un administrador lo apruebe y quede registrado quién, cuándo y por qué.",
      },
      "/internal/business-metadata/definitions/package": {
        systems:
          "Editor del paquete de definiciones del motor: eventos, observaciones, atributos y variables calculadas de un dominio, creados o actualizados de una vez. El paquete se revisa aquí con las mismas reglas que aplica el sistema y muestra los totales por tipo antes de guardarse.",
        business:
          "Carga masiva del vocabulario con el que se escriben las reglas y los modelos. Se revisa qué se va a publicar antes de aplicarlo, porque un código mal escrito deja reglas apuntando a señales que no existen.",
      },
    },
  },
  {
    module: "Linaje",
    prefixes: ["/internal/lineage"],
    systems:
      "Mapa de dependencias entre tablas, armado con las relaciones reales de la base y con las operaciones que leen o escriben cada tabla. Permite recorrerlo y ver a qué afecta un cambio.",
    business:
      "Responde '¿si toco esto, qué se rompe?': antes de cambiar una tabla o un proceso, muestra qué reportes, decisiones y módulos dependen de ella.",
    views: {
      "/internal/lineage": {
        systems:
          "Cuatro pestañas sobre el mismo inventario: «Grafo» (filtros por texto, módulo y tipo, con aviso cuando se recorta), «Nodos» (tablas y operaciones), «Relaciones e impacto» (qué operación toca qué tabla, con su gravedad, y cómo se relacionan las tablas entre sí) y «Mapa por dominio».",
        business:
          "Responde '¿si toco esto, qué se rompe?': qué rutas leen o escriben cada tabla y qué tablas dependen de otras, antes de cambiar nada.",
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
      "Administra las políticas de gobierno (conservación, datos personales, acceso), la política de riesgo vigente y las reglas e incidencias de calidad de datos.",
    business:
      "Garantiza que los datos se usen conforme a la regulación y con calidad suficiente para decidir: qué se puede guardar, por cuánto tiempo, quién lo ve y qué tan confiable es.",
    views: {
      "/internal/governance/policies": {
        systems:
          "Alta, edición y consulta de políticas: a qué tablas y campos aplican, en qué estado de publicación están y cómo se configuran.",
        business:
          "Las reglas del juego sobre los datos, versionadas y auditables: qué política aplica a qué información.",
      },
      "/internal/governance/privacy-requests": {
        systems:
          "Cola de solicitudes de privacidad de los clientes. El plazo es de 15 días naturales desde que llegan y las vencidas se marcan. El detalle muestra su historial y permite moverlas de recibida a en curso, y de ahí a completada o rechazada (cerrar exige motivo). Verlas y moverlas pide permisos distintos.",
        business:
          "Donde cumplimiento atiende los pedidos de los clientes sobre sus datos antes de que venza el plazo legal. Marcar una solicitud como atendida deja constancia; no borra datos: la supresión se hace a mano respetando lo que la ley obliga a conservar.",
      },
      "/internal/governance": {
        systems:
          "Dos pestañas. «Resumen»: cifras contadas sobre el inventario completo (datos personales, financieros, de riesgo y legales, operaciones que borran datos o son críticas y pendientes de revisión). «Datos personales»: las tablas y operaciones que guardan datos personales, con buscador.",
        business:
          "Cuánta información sensible maneja Atlas, dónde vive y qué tan revisada está, lista para una inspección.",
      },
      "/internal/risk-policy/current": {
        systems:
          "Política de riesgo LOCAL vigente, con sus umbrales y su versión. Es la red de seguridad para cuando el Motor de Decisión no responde, no la política que decide normalmente: esa vive en las versiones publicadas del Motor. Esta pantalla es de consulta: desde aquí no se crean ni se activan versiones.",
        business:
          "La configuración que decide aprobaciones/rechazos de riesgo hoy; consultarla evita discusiones sobre 'qué regla estaba activa'. Activar una versión cambia en vivo cómo se decide, así que solo lo hace un administrador y siempre queda registrado el motivo.",
      },
      "/internal/risk-policy/ruleset-versions": {
        systems:
          "La redacción de políticas se hace ahora en el Motor de Decisión. Esta dirección se mantiene para explicar dónde se hace: escribir reglas en el portal creaba una segunda política sin aprobación, sin separación de funciones y sin auditoría.",
        business:
          "Donde se arma una política de riesgo nueva sin tocar la que está corriendo. Queda en borrador hasta que un administrador la active, así se puede preparar y revisar un cambio de reglas sin riesgo para producción.",
      },
      "/internal/governance/policies/package": {
        systems:
          "Editor del paquete de gobierno: propósitos de privacidad, plazos de conservación, proveedores, clasificaciones, reglas para campos sensibles y reglas de calidad, creados o actualizados de una vez y revisados antes de guardarse.",
        business:
          "Carga masiva de las reglas de tratamiento de datos: qué se guarda, cuánto tiempo y quién lo ve. Se revisa el resumen antes de aplicar porque una retención mal cargada borra datos que había que conservar — o al revés.",
      },
      "/internal/data-quality/issues": {
        systems:
          "Incidencias de calidad de datos con la gravedad de su regla, búsqueda por tabla, código de regla o notas, y totales del filtro. Se reconocen (siguen pendientes), se corrigen o se descartan con motivo, y queda constancia en la auditoría. Hoy nada las crea solo: las reglas no se evalúan automáticamente. Sustituye a la antigua pantalla «Alertas».",
        business:
          "Los registros que no cumplen una regla de calidad y alguien tiene que atender; las pendientes cuentan en la preparación de salida.",
      },
      "/internal/data-quality/rules": {
        systems:
          "Reglas de calidad con su tabla, campo, gravedad, si están activas y sus incidencias pendientes. Las reglas todavía no se ejecutan: no hay historial de ejecución.",
        business:
          "El estándar de calidad acordado por dato: qué se considera aceptable y cuántos registros lo incumplen hoy.",
      },
    },
  },
  {
    module: "Reportes",
    prefixes: ["/internal/reports", "/internal/release-readiness"],
    systems:
      "Informes que genera Atlas, con copias fechadas de cada versión, y el tablero de preparación que junta las señales de pruebas, inventario y revisión antes de una salida.",
    business:
      "Convierte la telemetría técnica en material para decidir: estado de la plataforma, evidencia para auditoría y una respuesta objetiva a '¿podemos salir a producción?'.",
    views: {
      "/internal/reports/readiness": {
        systems:
          "Informe de preparación que cruza cuánto del inventario está cubierto, los resultados de las pruebas y lo que falta revisar.",
        business:
          "Lista de control antes de una salida: qué falta y qué riesgo se asume si se sale igual.",
      },
      "/internal/reports": {
        systems:
          "Informes disponibles, con sus versiones anteriores para descargar.",
        business:
          "Biblioteca de evidencia: cada corte queda versionado para comparar evolución y sustentar decisiones pasadas.",
      },
      "/internal/release-readiness": {
        systems:
          "Semáforo en vivo antes de una salida: resultados de pruebas, revisión del inventario y estado de las herramientas.",
        business:
          "La foto actual de si la plataforma está lista para un despliegue sin sorpresas.",
      },
    },
  },
  {
    module: "QA",
    prefixes: ["/internal/qa"],
    systems:
      "Consola de pruebas sobre el inventario: laboratorio para llamar a operaciones con datos controlados, pruebas de varios pasos con comprobaciones, historial de ejecuciones y perfiles de carga limitados a direcciones autorizadas.",
    business:
      "Permite verificar que la plataforma se comporta como se espera antes de exponer cambios a clientes, y deja evidencia auditable de cada prueba.",
    views: {
      "/internal/qa/aprender": {
        systems:
          "Dos pestañas. «Recorridos»: tutoriales guiados del laboratorio, filtrables por tema y con buscador; cada uno se sigue sobre las pantallas reales y el avance se guarda para retomarlo. «Guía de referencia»: los tres modos (funcional, carga y recorrido encadenado), los escenarios de prueba, los umbrales para aprobar y las protecciones de seguridad.",
        business:
          "Que alguien nuevo aprenda a probar la plataforma a su ritmo, sin depender de que otra persona le explique. No ejecuta pruebas por sí mismo ni deja evidencia de calidad: eso lo hacen el laboratorio y las ejecuciones.",
      },
      "/internal/qa/lab": {
        systems:
          "Prueba puntual de una operación del inventario: prepara la petición con lo que la operación espera (datos mínimos, cabeceras y roles) y muestra la respuesta tal cual. En «Recorridos», cada ejecución muestra su registro paso a paso y su evidencia, y se listan las campañas ya preparadas.",
        business:
          "Reproducir un caso puntual en segundos — para soporte, debugging o validar un fix — sin herramientas externas.",
      },
      "/internal/qa/suites": {
        systems:
          "Pruebas de varios pasos, donde cada paso puede usar datos del anterior y comprueba la respuesta; se guardan por versiones y solo se ejecutan en ambientes permitidos.",
        business:
          "Los flujos críticos del negocio (onboarding, decisión, notificación) probados de punta a punta y repetibles.",
      },
      "/internal/qa/runs": {
        systems:
          "Historial de ejecuciones con el resultado de cada paso, los tiempos de respuesta y los datos enviados, sin información sensible.",
        business:
          "Evidencia de qué se probó, cuándo y con qué resultado: la base para decidir si una versión está lista para salir.",
      },
      "/internal/qa/stress": {
        systems:
          "Perfiles de carga por operación (peticiones por segundo, duración y ambiente), que se ejecutan con aprobación previa.",
        business:
          "Confirma que los picos esperados (campañas, cierres) no van a tumbar la plataforma, antes de vivirlos en producción.",
      },
    },
  },
];
