"use client";

import { useMemo, useState } from "react";
import type { TrafficLatencyBucket } from "@/features/systems/types";
import { formatNumber } from "@/shared/lib/format";

const CHART_HEIGHT = 220;
const BAR_AREA_HEIGHT = 160;
const COLUMN_WIDTH = 28;
const COLUMN_GAP = 6;
const LEFT_PADDING = 8;

/**
 * Combo chart (barras = hits, línea = p95) sin dependencias externas: un
 * único SVG comparte el mismo eje X para que ambas variables se lean en la
 * misma escala temporal. Las barras usan su propio eje (max hits del rango);
 * la línea usa el suyo (max p95 del rango), así ninguna aplasta a la otra.
 */
export function TrafficLatencyTimeseriesChart({
  buckets,
}: Readonly<{ buckets: TrafficLatencyBucket[] }>) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxHits = Math.max(1, ...buckets.map((b) => b.totalRequests));
  const maxLatency = Math.max(1, ...buckets.map((b) => b.p95LatencyMs));
  const width = LEFT_PADDING * 2 + buckets.length * (COLUMN_WIDTH + COLUMN_GAP);

  const linePoints = useMemo(
    () =>
      buckets
        .map((bucket, index) => {
          const x =
            LEFT_PADDING +
            index * (COLUMN_WIDTH + COLUMN_GAP) +
            COLUMN_WIDTH / 2;
          const y =
            BAR_AREA_HEIGHT -
            (bucket.p95LatencyMs / maxLatency) * BAR_AREA_HEIGHT;
          return `${x},${y}`;
        })
        .join(" "),
    [buckets, maxLatency],
  );

  if (buckets.length === 0) return null;
  const active = hoverIndex != null ? buckets[hoverIndex] : null;

  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-atlas-text">
            Serie de tiempo: hits y latencia (p95)
          </h4>
          <p className="text-xs text-atlas-muted">
            Barras = requests por bucket · línea = p95 de latencia.
          </p>
        </div>
        {active ? (
          <div className="rounded-md bg-atlas-soft px-3 py-1.5 text-xs text-atlas-text">
            <span className="font-semibold">
              {formatBucketLabel(active.bucketStart, true)}
            </span>
            {" · "}
            {formatNumber(active.totalRequests)} reqs · p95{" "}
            {formatNumber(active.p95LatencyMs)} ms
          </div>
        ) : null}
      </div>
      <div className="atlas-scrollbar overflow-x-auto">
        <svg
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Serie de tiempo de hits y latencia"
        >
          {buckets.map((bucket, index) => {
            const x = LEFT_PADDING + index * (COLUMN_WIDTH + COLUMN_GAP);
            const barHeight =
              (bucket.totalRequests / maxHits) * BAR_AREA_HEIGHT;
            return (
              <g key={bucket.bucketStart}>
                <rect
                  x={x}
                  y={BAR_AREA_HEIGHT - barHeight}
                  width={COLUMN_WIDTH}
                  height={Math.max(barHeight, bucket.totalRequests > 0 ? 2 : 0)}
                  rx={3}
                  className={
                    hoverIndex === index
                      ? "fill-atlas-accent"
                      : "fill-atlas-accent/60"
                  }
                />
                {/* Hit target más ancho que la barra para hover cómodo. */}
                <rect
                  x={x - COLUMN_GAP / 2}
                  y={0}
                  width={COLUMN_WIDTH + COLUMN_GAP}
                  height={BAR_AREA_HEIGHT + 34}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() =>
                    setHoverIndex((current) =>
                      current === index ? null : current,
                    )
                  }
                />
                {index % xAxisStep(buckets.length) === 0 ? (
                  <text
                    x={x + COLUMN_WIDTH / 2}
                    y={BAR_AREA_HEIGHT + 16}
                    textAnchor="middle"
                    className="fill-atlas-muted text-[9px]"
                  >
                    {formatBucketLabel(bucket.bucketStart, false)}
                  </text>
                ) : null}
              </g>
            );
          })}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {buckets.map((bucket, index) => {
            const x =
              LEFT_PADDING +
              index * (COLUMN_WIDTH + COLUMN_GAP) +
              COLUMN_WIDTH / 2;
            const y =
              BAR_AREA_HEIGHT -
              (bucket.p95LatencyMs / maxLatency) * BAR_AREA_HEIGHT;
            return (
              <circle
                key={`dot-${bucket.bucketStart}`}
                cx={x}
                cy={y}
                r={hoverIndex === index ? 3.5 : 2}
                fill="#2563eb"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-atlas-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-atlas-accent/60" />
          Requests (max {formatNumber(maxHits)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-blue-600" />
          p95 latencia (max {formatNumber(maxLatency)} ms)
        </span>
      </div>
    </div>
  );
}

function xAxisStep(count: number): number {
  if (count <= 12) return 1;
  if (count <= 24) return 2;
  if (count <= 48) return 4;
  return Math.ceil(count / 12);
}

function formatBucketLabel(iso: string, withDate: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!withDate) return time;
  const day = date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${day} ${time}`;
}
