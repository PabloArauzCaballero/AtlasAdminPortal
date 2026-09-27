"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useAuth } from "@/shared/auth/auth-context";
import {
  useKnowledgeVersion,
  useVersionTransitionMutation,
} from "./knowledge-hooks";
import {
  knowledgeErrorMessage,
  type VersionAction,
} from "./knowledge-services";
import { isOwnVersion, type VersionTransition } from "./knowledge-types";
import { KnowledgeVersionPreview } from "./knowledge-version-preview";

export const ACCIONES: Record<
  VersionAction,
  { boton: string; titulo: string; explicacion: string }
> = {
  "submit-review": {
    boton: "Enviar a revisión",
    titulo: "Enviar la versión a revisión",
    explicacion:
      "Deja de ser un borrador editable por su autor y queda esperando que otra persona la apruebe.",
  },
  approve: {
    boton: "Aprobar",
    titulo: "Aprobar la versión",
    explicacion:
      "Confirmas que el texto es correcto. Quien la redactó no puede aprobarla, y los artículos de crédito, riesgo, pagos, identidad, seguridad, privacidad o legal los aprueba riesgo o cumplimiento.",
  },
  publish: {
    boton: "Publicar",
    titulo: "Publicar la versión",
    explicacion:
      "Pasa a ser la respuesta oficial que ve la gente desde ahora. La versión publicada anterior en el mismo idioma se retira y queda en el historial.",
  },
};

/** El paso que sigue a cada estado; lo publicado o retirado ya no avanza. */
export function siguienteAccion(status: string): VersionAction | null {
  if (status === "DRAFT") return "submit-review";
  if (status === "IN_REVIEW") return "approve";
  if (status === "APPROVED") return "publish";
  return null;
}

/**
 * Confirmar una transición, con el texto completo de la versión delante.
 *
 * Es un panel y no un clic directo porque aprobar y publicar son las dos acciones que cambian lo que
 * lee la gente. El botón no se habilita hasta que la versión se leyó del servidor, y aprobar la
 * propia no se ofrece: el servidor la rechazaría igual (`KNOWLEDGE_SELF_APPROVAL_FORBIDDEN`).
 */
export function KnowledgeTransitionDialog({
  versionId,
  action,
  onClose,
  onDone,
}: Readonly<{
  versionId: string;
  action: VersionAction;
  onClose: () => void;
  onDone: (result: VersionTransition) => void;
}>) {
  const { user } = useAuth();
  const version = useKnowledgeVersion(versionId);
  const mover = useVersionTransitionMutation();
  const [note, setNote] = useState("");
  const accion = ACCIONES[action];
  const propia =
    action === "approve" && version.data
      ? isOwnVersion(version.data, user?.id)
      : false;
  const listo = Boolean(version.data) && !propia && !mover.isPending;

  return (
    <DrawerPanel
      open
      title={`${accion.titulo} #${versionId}`}
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!listo) return;
          mover.mutate(
            { versionId, action, note: note.trim() || undefined },
            { onSuccess: onDone },
          );
        }}
      >
        <p className="text-sm leading-6 text-atlas-text">
          {accion.explicacion}
        </p>
        <KnowledgeVersionPreview versionId={versionId} />
        {propia ? (
          <p role="alert" className="text-sm text-amber-800">
            La redactaste tú: otra persona tiene que aprobarla.
          </p>
        ) : null}
        <Field
          label="Nota"
          tooltip="Comentario opcional para quien siga el proceso, por ejemplo qué revisaste antes de aprobar."
          hint="Opcional, hasta 400 caracteres."
        >
          <Textarea
            className="min-h-20"
            maxLength={400}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {mover.error ? (
          <ErrorState
            title="No se pudo completar."
            description={knowledgeErrorMessage(mover.error)}
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!listo}
            isLoading={mover.isPending}
          >
            {accion.boton}
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
