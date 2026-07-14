"use client";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { NewColumnInput, NewRelationshipInput } from "./types";

export function ColumnRowEditor({
  column,
  onChange,
  onRemove,
}: Readonly<{
  column: NewColumnInput;
  onChange: (next: NewColumnInput) => void;
  onRemove?: () => void;
}>) {
  return (
    <div className="rounded-lg border border-atlas-border p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          value={column.columnName}
          onChange={(event) =>
            onChange({ ...column, columnName: event.target.value })
          }
          placeholder="column_name"
          className="font-mono text-xs"
        />
        <Input
          value={column.columnType}
          onChange={(event) =>
            onChange({ ...column, columnType: event.target.value })
          }
          placeholder="tipo (ej: bigint, varchar(120))"
          className="font-mono text-xs"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-atlas-text">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={column.isNullable}
            onChange={(event) =>
              onChange({ ...column, isNullable: event.target.checked })
            }
          />
          Nullable
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={column.isImmutable}
            onChange={(event) =>
              onChange({ ...column, isImmutable: event.target.checked })
            }
          />
          Inmutable
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={column.isPii}
            onChange={(event) =>
              onChange({ ...column, isPii: event.target.checked })
            }
          />
          PII
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={column.isIndexed}
            onChange={(event) =>
              onChange({ ...column, isIndexed: event.target.checked })
            }
          />
          Indexada
        </label>
        {onRemove ? (
          <Button
            variant="ghost"
            className="ml-auto h-7 px-2 text-xs"
            onClick={onRemove}
          >
            Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function RelationshipRowEditor({
  relationship,
  onChange,
  onRemove,
}: Readonly<{
  relationship: NewRelationshipInput;
  onChange: (next: NewRelationshipInput) => void;
  onRemove: () => void;
}>) {
  return (
    <div className="rounded-lg border border-atlas-border p-3">
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          value={relationship.sourceColumnName}
          onChange={(event) =>
            onChange({ ...relationship, sourceColumnName: event.target.value })
          }
          placeholder="columna origen"
          className="font-mono text-xs"
        />
        <Input
          value={relationship.targetTableName}
          onChange={(event) =>
            onChange({ ...relationship, targetTableName: event.target.value })
          }
          placeholder="tabla destino"
          className="font-mono text-xs"
        />
        <Input
          value={relationship.targetColumnName}
          onChange={(event) =>
            onChange({ ...relationship, targetColumnName: event.target.value })
          }
          placeholder="columna destino"
          className="font-mono text-xs"
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-atlas-text">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={relationship.cascadeDelete}
            onChange={(event) =>
              onChange({ ...relationship, cascadeDelete: event.target.checked })
            }
          />
          Cascade delete
        </label>
        <Button
          variant="ghost"
          className="ml-auto h-7 px-2 text-xs"
          onClick={onRemove}
        >
          Quitar
        </Button>
      </div>
    </div>
  );
}
