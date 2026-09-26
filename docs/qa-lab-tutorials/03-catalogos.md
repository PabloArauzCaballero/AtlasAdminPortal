# Catálogos: tutoriales, tooltips y errores (Fase 8)

## 1. Matriz de tutoriales por módulo y pestaña

| id                     | Módulo      | Pestaña           | Nivel      | Objetivo                               | Pasos |
| ---------------------- | ----------- | ----------------- | ---------- | -------------------------------------- | ----- |
| `qa-lab-overview`      | Laboratorio | —                 | Básico     | Entender la plataforma                 | 4     |
| `qa-lab-functional`    | Laboratorio | Prueba unitaria   | Básico     | Probar una API                         | 6     |
| `qa-lab-stress`        | Laboratorio | Prueba unitaria   | Intermedio | Rendimiento bajo carga                 | 3     |
| `qa-lab-journey`       | Laboratorio | Journey           | Avanzado   | Prueba de flujo/interfaz               | 3     |
| `qa-lab-decision-tree` | Laboratorio | Árbol de decisión | Intermedio | Entender el recorrido real del cliente | 8     |
| `qa-suites-list`       | Suites      | Lista             | Básico     | Crear primera suite                    | 5     |
| `qa-suite-detail`      | Suites      | Detalle           | Intermedio | Ejecutar suite y casos                 | 4     |
| `qa-runs-interpret`    | Runs        | Detalle           | Básico     | Analizar prueba fallida                | 3     |
| `qa-stress-profile`    | Stress      | Perfiles          | Avanzado   | Uso avanzado de carga                  | 4     |

Cada paso cubre (según aplique): qué es · para qué sirve · cuándo usarlo · qué
necesitas · qué significa cada campo/botón · resultado esperado · cómo
interpretarlo · errores habituales · cómo corregirlos · qué hacer después ·
ejemplo práctico. Los estados de ejecución (Pendiente, En ejecución, Aprobado,
Fallido, Bloqueado, Omitido, Cancelado, Error de infraestructura) se explican en
`qa-runs-interpret` con su acción recomendada.

### Recorridos sugeridos (learning paths)

Primeros pasos · Gestión de suites · Pruebas de API · Recorridos y dependencias ·
Rendimiento y carga · Análisis de errores. (`learning-paths.ts`)

### Demos visuales dentro de la tarjeta (`TutorialStep.demo`)

- `latency` — curva de latencia animada con el umbral p95 (`qa-lab-stress`).
- `decision-tree` — flujo animado de tres etapas con su bifurcación de
  excepción, como el que publica el catálogo de flujos (`qa-lab-decision-tree`).

### Launcher por objetivo («¿Qué quieres hacer?»)

Se alimenta de `tutorial.goal`: crear mi primera suite, probar una API, probar
rendimiento, crear una prueba de flujo, analizar una prueba fallida, etc.

## 2. Catálogo de tooltips / ayuda de campo (`field-help-catalog.ts`)

| Clave                       | Campo                    | Tooltip                                |
| --------------------------- | ------------------------ | -------------------------------------- |
| `suite.name`                | Nombre de la suite       | Nombre reconocible de la funcionalidad |
| `suite.type`                | Tipo de prueba           | Funcional / regresión / humo…          |
| `suite.module`              | Módulo                   | Área de negocio (catálogo)             |
| `suite.environmentScope`    | Ambientes permitidos     | Dónde puede ejecutarse                 |
| `suite.isSafeForProduction` | Segura para producción   | Sólo si no altera datos reales         |
| `case.expectedResult`       | Resultado esperado       | Qué debería ocurrir si funciona        |
| `stress.virtualUsers`       | Usuarios virtuales (VUs) | Peticiones simultáneas                 |
| `stress.duration`           | Duración                 | Cuánto se mantiene la carga            |
| `stress.p95Threshold`       | Umbral p95 (ms)          | Tope para el 95% de respuestas         |
| `endpoint.select`           | Endpoint                 | Qué endpoint del backend probar        |

Cada entrada aporta tooltip + texto de ayuda + ejemplo, y se renderiza con
`FieldHelpLabel` (label + `InfoDot` accesible). Los campos definidos por catálogo
(tipo, estado, prioridad, severidad, ambiente, etc.) deben usar select/combobox
con opciones del backend — la guía lo explica y `qa-suites-list` lo refuerza.

## 3. Catálogo de errores y tutorial relacionado (`error-catalog.ts`)

Cada error se traduce a lenguaje natural con: qué ocurrió · causas probables ·
consecuencia de negocio · pasos de solución · acción recomendada · enlace al
tutorial en el paso exacto · detalle técnico plegable · código · id de soporte.

| Código                      | Título didáctico                     | Tutorial → paso     |
| --------------------------- | ------------------------------------ | ------------------- |
| `HTTP_401`                  | La API pidió autenticación           | `qa-lab-functional` |
| `HTTP_404`                  | La ruta probada no existe            | `qa-lab-functional` |
| `HTTP_500`                  | El servidor tuvo un problema interno | `qa-lab-functional` |
| `STRESS_THRESHOLD_EXCEEDED` | El endpoint no aguantó la carga      | `qa-lab-stress`     |
| `STRESS_CONFIG_INVALID`     | Configuración de carga inválida      | `qa-stress-profile` |
| `STEP_FAILED`               | Un paso terminó en fallo             | `qa-runs-interpret` |
| `STEP_BLOCKED`              | Un paso quedó bloqueado              | `qa-runs-interpret` |
| `INFRA_ERROR`               | Falló el entorno, no la prueba       | `qa-runs-interpret` |

El enlace error→paso se construye por índice inverso desde `relatedErrorCodes`
de cada paso: no se duplica contenido y un test valida que todos los códigos
apuntan a un paso existente.
