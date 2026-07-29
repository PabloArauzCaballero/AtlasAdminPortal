# Lienzo del catálogo de flujos (`/internal/qa/lab` → Árbol de decisión)

La pestaña **Árbol de decisión** del Laboratorio dibuja el catálogo de flujos que
publica AtlasBackend. No es un diagrama mantenido a mano ni derivado en el
portal: es la lectura de `GET /api/v1/workflows/:workflowCode`.

## Qué consume

| Endpoint                                     | Para qué en la vista                           |
| -------------------------------------------- | ---------------------------------------------- |
| `GET /workflows`                             | selector de flujo                              |
| `GET /workflows/:code/versions`              | selector de versión (`latest` o una concreta)  |
| `GET /workflows/:code`                       | árbol completo: etapas, pasos y transiciones   |
| `GET /workflows/:code/graph`                 | disponible en `services.ts`, aún sin uso en UI |
| `POST /workflows/:code/transitions/validate` | disponible en `services.ts`, aún sin uso en UI |

Los filtros (`moduleCode`, `actorType`, `version`) se mandan al **backend**: es
quien recorta el árbol preservando la cadena de ancestros y sin dejar
transiciones apuntando a pasos que ya no están. Recortar en el navegador
produciría flechas huérfanas.

## Cómo se dibuja

- `workflow-graph-layout.ts` — layout puro: una **columna por etapa** (las
  subetapas abren su propia columna y la madre las envuelve), un **nodo por
  endpoint** apilado dentro de su columna, y una arista por transición con
  puertos laterales. Las transiciones hacia atrás rodean por debajo.
- `workflow-viewport.ts` — cámara: `zoomAt` (ancla el punto bajo el cursor),
  `panBy`, `fitHeight` (encuadre de apertura, tamaño de lectura) y `fitToView`
  (ver el flujo entero). Escala acotada a 0.2–2.
- `workflow-graph-view.tsx` — lienzo navegable: arrastrar para mover, rueda para
  desplazar, Ctrl/⌘/Shift + rueda para zoom. **Solo lectura**: no se arrastran
  ni se editan los nodos, porque el catálogo es del backend.
- `workflow-graph-layers.tsx` — capas de transiciones, dependencias y los
  distintivos ENTRADA/SALIDA (las transiciones con un extremo nulo).
- `workflow-detail.tsx` — ficha del elemento seleccionado: roles, estados
  requeridos y resultantes, eventos, errores, dependencias y la regla de
  completitud de la etapa traducida a lenguaje llano.

## Vocabulario del dibujo

- Color del nodo/columna = **actor** (cliente, interno, sistema, proveedor).
- Borde punteado = **opcional**.
- Color de la flecha = **condición** de la transición: verde `on_success`, roja
  `on_error`, azul `on_state`, ámbar `conditional`, gris `always`. Punteada =
  no es el camino principal (`isDefaultPath: false`).
- Morada punteada = **dependencia** (`requires_completion`, `requires_data`,
  `soft`). Ocultas por defecto; se muestran al seleccionar un nodo o con el
  interruptor «Ver todas las dependencias» — las 18 del flujo estándar cruzando
  a la vez tapaban el resto.

## Verificación contra el backend

El flujo sembrado (`customer_credit_journey` v1) trae 22 etapas, 57 pasos, 33
transiciones y 18 dependencias. El fixture de
`tests/unit/features/workflows/fixtures/customer-credit-journey.json` es la
respuesta real capturada de ese endpoint, así que las pruebas del lienzo corren
contra la forma verdadera del flujo y no contra un ejemplo de tres cajas.

Del lado del backend, `yarn smoke:workflow` comprueba contra la API levantada
que el catálogo está sembrado, que el grafo trae nodos y aristas y que el
informe de consistencia no reporta divergencias con las rutas montadas.
