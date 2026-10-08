"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/shared/auth/auth-context";
import { Tooltip } from "@/shared/components/ui/tooltip";
import { accountNavItem } from "./nav-account";

/**
 * Quién está sentado, arriba a la derecha.
 *
 * Vivía al pie de la barra lateral, debajo de sesenta enlaces: había que desplazarse para saber con
 * qué cuenta se estaba trabajando, que es justo lo que conviene tener a la vista antes de aprobar
 * algo. Arriba a la derecha es donde cualquier persona lo busca sin que nadie se lo enseñe.
 *
 * El nombre sigue siendo la puerta a «Mi cuenta» (perfil y seguridad de la sesión), y la salida va
 * pegada a él: son las dos únicas cosas de la barra que son de uno y no del portal.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const nombre = user?.fullName ?? "Usuario interno";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={accountNavItem.href}
        aria-label={`Mi cuenta: ${nombre}`}
        className="atlas-press flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-atlas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-primary/40 lg:pr-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-atlas-accent to-atlas-primary text-xs font-semibold text-white">
          {nombre.slice(0, 1).toUpperCase()}
        </span>
        {/* En pantallas estrechas queda la inicial: el nombre entero empujaba las migas de pan. */}
        <span className="hidden min-w-0 max-w-[11rem] lg:block">
          <span className="block truncate text-sm font-semibold leading-4 text-atlas-text">
            {nombre}
          </span>
          <span className="block truncate text-xs leading-4 text-atlas-muted">
            {user?.email}
          </span>
        </span>
      </Link>
      <Tooltip text="Cierra tu sesión en este navegador. Tendrás que volver a entrar con tu contraseña y tu PIN.">
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          className="atlas-press atlas-tap flex h-10 w-10 items-center justify-center rounded-full text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  );
}
