import Link from "next/link";
import { EmptyState } from "@/shared/components/ui/states";

/**
 * Las versiones de esquema se crean por migración, pero su inventario (tablas, columnas, relaciones) no lo escribe
 * ningún proceso del código: en un entorno desplegado de cero la versión existe con 0 tablas mientras su nota dice
 * «121 tables». Una tabla vacía ahí se leía como «el esquema no tiene tablas». Este aviso lo dice, y manda al catálogo
 * de datos, que sí se llena solo (introspección del esquema real).
 */
export function SchemaInventoryMissingNote({
  versionCodes,
}: Readonly<{ versionCodes: string[] }>) {
  if (!versionCodes.length) return null;
  return (
    <div className="mb-6" data-testid="schema-inventory-missing">
      <EmptyState
        title={`Sin inventario de tablas: ${versionCodes.join(", ")}`}
        description="Esta versión está registrada, pero en este entorno nadie cargó su inventario de tablas y columnas: el cero no quiere decir que el esquema esté vacío. El esquema real, leído de la base, está en el catálogo de datos."
        action={
          <Link
            className="font-medium text-atlas-accent underline"
            href="/internal/data-catalog/tables"
          >
            Abrir el catálogo de datos
          </Link>
        }
      />
    </div>
  );
}
