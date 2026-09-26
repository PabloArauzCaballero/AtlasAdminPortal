import type { HealthPoint } from "../types";

/**
 * La serie de los últimos chequeos de un proveedor, dibujada a mano en SVG.
 *
 * A mano y no con una librería de gráficos porque el portal no tiene ninguna y traer una entera
 * (recharts pesa más que todo este módulo) para pintar ocho líneas de treinta puntos es un mal
 * negocio. Son 40 líneas de SVG.
 *
 * Lo que se dibuja es la LATENCIA; lo que se colorea es la DISPONIBILIDAD. Son dos preguntas
 * distintas y la respuesta a una no sirve para la otra: un proveedor puede responder siempre y
 * tardar cada vez más, y eso es exactamente lo que hay que ver venir.
 */
export function HealthSparkline({
  points,
  tone,
}: Readonly<{
  points: HealthPoint[];
  tone: "success" | "warning" | "critical" | "muted";
}>) {
  const STROKE = {
    success: "stroke-emerald-500",
    warning: "stroke-amber-500",
    critical: "stroke-red-500",
    muted: "stroke-slate-300",
  }[tone];
  const FILL = {
    success: "fill-emerald-50",
    warning: "fill-amber-50",
    critical: "fill-red-50",
    muted: "fill-slate-50",
  }[tone];

  // Con menos de dos puntos no hay línea que trazar: se dice, en vez de dibujar un gráfico vacío
  // que se lee como «cero» cuando en realidad significa «todavía no se midió».
  if (points.length < 2) {
    return (
      <div className="flex h-9 items-center text-xs text-atlas-muted">
        {points.length === 0 ? "Sin mediciones todavía" : "Una sola medición"}
      </div>
    );
  }

  const width = 120;
  const height = 36;
  const values = points.map((point) => point.latencyMs);
  const max = Math.max(...values, 1);
  // El suelo es 0 y no el mínimo de la serie: escalar al mínimo convierte una variación de 2 ms
  // en una montaña, y un proveedor plano y sano parece inestable.
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - (point.latencyMs / max) * (height - 4) - 2;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M ${coords.join(" L ")}`;
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      role="img"
      aria-label={`Últimas ${points.length} mediciones. La más reciente: ${last.latencyMs} ms, estado ${last.status}.`}
    >
      <path d={area} className={FILL} stroke="none" />
      <path
        d={line}
        className={STROKE}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
