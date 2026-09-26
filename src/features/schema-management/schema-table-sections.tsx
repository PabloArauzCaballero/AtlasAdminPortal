"use client";

import {
  KeyRound,
  Link2,
  Lock,
  ShieldAlert,
  Trash2,
  Unlock,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { safeText } from "@/shared/lib/format";
import type { SchemaColumn, SchemaRelationship } from "./types";
import { splitQualifiedName } from "./schema-table-columns";

/**
 * Las columnas de una tabla, con sus propiedades como insignias en vez de como celdas de «Sí/No».
 *
 * Siete columnas booleanas escritas «Sí»/«No» obligan a leer la cabecera para saber qué se está
 * afirmando en cada celda. Con insignias solo aparece lo que ES cierto —PII, inmutable, indexada—,
 * así que la fila se lee sin cruzar la vista con el encabezado y lo excepcional resalta solo.
 */
export function ColumnsSection({
  columns,
}: Readonly<{ columns: SchemaColumn[] }>) {
  const piiCount = columns.filter((column) => column.isPii).length;
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <KeyRound className="h-4 w-4 text-atlas-accent" aria-hidden />
          Columnas
        </h2>
        <Badge tone="default">{columns.length}</Badge>
        {piiCount > 0 ? (
          <Badge tone="pii">
            <ShieldAlert className="h-3 w-3" aria-hidden />
            {piiCount} con datos personales
          </Badge>
        ) : null}
      </CardHeader>
      <div className="atlas-table-scroll atlas-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
            <tr>
              <th className="px-4 py-2.5 text-left">Columna</th>
              <th className="px-4 py-2.5 text-left">Tipo</th>
              <th className="px-4 py-2.5 text-left">Propiedades</th>
              <th className="px-4 py-2.5 text-left">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {columns.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-atlas-muted"
                >
                  Esta tabla no tiene columnas registradas en el catálogo.
                </td>
              </tr>
            ) : (
              columns.map((column) => (
                <tr key={column._id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-atlas-text">
                    {column.columnName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-atlas-muted">
                    {column.columnType}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {column.isPii ? (
                        <Badge tone="pii">
                          <ShieldAlert className="h-3 w-3" aria-hidden />
                          PII
                        </Badge>
                      ) : null}
                      {column.isImmutable ? (
                        <Badge tone="warning">
                          <Lock className="h-3 w-3" aria-hidden />
                          Inmutable
                        </Badge>
                      ) : null}
                      {column.isIndexed ? (
                        <Badge tone="success">
                          <Zap className="h-3 w-3" aria-hidden />
                          Indexada
                        </Badge>
                      ) : null}
                      {column.isNullable ? (
                        <Badge tone="muted">
                          <Unlock className="h-3 w-3" aria-hidden />
                          Opcional
                        </Badge>
                      ) : (
                        <Badge tone="info">Obligatoria</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-atlas-muted">
                    {safeText(column.description)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Las claves foráneas salientes. Siempre inmutables: cambiar una FK exige una versión nueva del
 * esquema (regla 1 del módulo `schema-management`), así que no se pinta como si fuera un atributo
 * que a veces está y a veces no.
 */
export function RelationshipsSection({
  relationships,
}: Readonly<{ relationships: SchemaRelationship[] }>) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <Link2 className="h-4 w-4 text-atlas-accent" aria-hidden />
          Relaciones salientes
        </h2>
        <Badge tone="default">{relationships.length}</Badge>
      </CardHeader>
      {relationships.length === 0 ? (
        <p className="p-5 text-sm text-atlas-muted">
          Esta tabla no declara claves foráneas hacia otras tablas.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {relationships.map((relationship) => {
            const target = splitQualifiedName(relationship.targetTableName);
            return (
              <li
                key={relationship._id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-sm hover:bg-slate-50/70"
              >
                <span className="font-mono text-xs font-semibold text-atlas-text">
                  {relationship.sourceColumnName}
                </span>
                <Link2 className="h-3.5 w-3.5 text-atlas-accent" aria-hidden />
                <span className="font-mono text-xs text-atlas-muted">
                  {target.schema ? `${target.schema}.` : ""}
                  <span className="font-semibold text-atlas-text">
                    {target.table}
                  </span>
                  .{relationship.targetColumnName}
                </span>
                {relationship.cascadeDelete ? (
                  <Badge tone="warning">
                    <Trash2 className="h-3 w-3" aria-hidden />
                    Borrado en cascada
                  </Badge>
                ) : null}
                <Badge tone="muted" className="ml-auto">
                  <Lock className="h-3 w-3" aria-hidden />
                  Inmutable
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
