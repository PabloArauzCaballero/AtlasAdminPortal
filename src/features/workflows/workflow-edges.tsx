/**
 * Vocabulario visual de las aristas: el color y el nombre llano de cada
 * condición declarada, más las puntas de flecha que comparten todas.
 */

export const CONDITION_COLOR: Record<string, string> = {
  on_success: "#10b981",
  on_error: "#ef4444",
  on_state: "#2563eb",
  conditional: "#f59e0b",
  always: "#64748b",
};

export const CONDITION_LABEL: Record<string, string> = {
  on_success: "si sale bien",
  on_error: "si falla",
  on_state: "según el estado",
  conditional: "condicional",
  always: "siempre",
};

export const DEPENDENCY_COLOR = "#a855f7";

export function EdgeMarkers() {
  return (
    <defs>
      {[
        ...Object.entries(CONDITION_COLOR),
        ["dependency", DEPENDENCY_COLOR] as const,
      ].map(([key, color]) => (
        <marker
          key={key}
          id={`wf-arrow-${key}`}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      ))}
    </defs>
  );
}
