# QA Lab logs

El navegador no puede escribir directamente en el filesystem del proyecto. Por eso el QA Lab genera logs compatibles con Pino en formato NDJSON y los expone como descarga desde la interfaz.

Nombre esperado de descarga:

- `.logs/qa-direct-<runId>.log`
- `.logs/qa-stress-<runId>.log`

Cada línea es un evento JSON con campos tipo Pino: `level`, `time`, `pid`, `hostname`, `name`, `layer`, `event`, `msg`, `runId` y `data` sanitizada.
