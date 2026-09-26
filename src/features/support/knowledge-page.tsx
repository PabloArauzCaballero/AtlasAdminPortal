"use client";

import { useState } from "react";
import { BookOpenText, Plus } from "lucide-react";
import { SUPPORT_KNOWLEDGE_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { KnowledgeArticleForm } from "./knowledge-article-form";
import { useTrackedVersions } from "./knowledge-hooks";
import { KnowledgePublishedSection } from "./knowledge-published-section";
import type { KnowledgeVersion } from "./knowledge-types";
import { KnowledgeVersionForm } from "./knowledge-version-form";
import { KnowledgeVersionsPanel } from "./knowledge-versions-panel";

type ArticuloElegido = { articleId: string; articleKey: string };

/**
 * «Soporte › Base de conocimiento»: las respuestas oficiales de Atlas y quién las aprueba.
 *
 * Las cinco rutas de `admin/support/knowledge/*` existían sin ninguna pantalla que las llamara, así
 * que la ayuda de la app sólo se podía escribir con SQL. El recorrido es crear el artículo, redactar
 * su versión, enviarla a revisión, que OTRA persona la apruebe y publicarla.
 */
export function SupportKnowledgePage() {
  return (
    <RoleGate roles={SUPPORT_KNOWLEDGE_ROLE_LIST}>
      <BaseDeConocimiento />
    </RoleGate>
  );
}

function BaseDeConocimiento() {
  const { versiones, registrar, olvidar } = useTrackedVersions();
  const [creando, setCreando] = useState(false);
  const [redactando, setRedactando] = useState<ArticuloElegido | null>(null);

  const alRedactar = (version: KnowledgeVersion) => {
    registrar({
      versionId: version.versionId,
      articleId: version.articleId,
      articleKey: version.articleKey,
      title: version.title,
      status: version.status,
      updatedAt: new Date().toISOString(),
    });
    setRedactando(null);
  };

  return (
    <>
      <PageHeader
        icon={BookOpenText}
        eyebrow="Soporte"
        title="Base de conocimiento"
        description="Los artículos de ayuda que leen clientes, comercios y el equipo: redactarlos, revisarlos, aprobarlos y publicarlos."
        actions={
          <Button variant="primary" onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Crear artículo
          </Button>
        }
      />
      <BusinessContextNote>
        Un artículo publicado no se edita: para cambiar lo que dice se redacta
        otra versión, que vuelve a pasar por revisión. Así siempre se puede
        saber qué decía la ayuda el día en que alguien la siguió. Quien redacta
        una versión no puede aprobarla, y los artículos de crédito, riesgo,
        pagos, identidad, seguridad, privacidad o legal los aprueba alguien de
        riesgo o cumplimiento.
      </BusinessContextNote>

      <div className="space-y-8">
        <KnowledgeVersionsPanel
          versiones={versiones}
          onRegistrar={registrar}
          onOlvidar={olvidar}
        />
        <KnowledgePublishedSection onNuevaVersion={setRedactando} />
      </div>

      {creando ? (
        <KnowledgeArticleForm
          onClose={() => setCreando(false)}
          onCreated={(articulo) => {
            setCreando(false);
            setRedactando({
              articleId: articulo.articleId,
              articleKey: articulo.articleKey,
            });
          }}
        />
      ) : null}

      {redactando ? (
        <KnowledgeVersionForm
          article={redactando}
          onClose={() => setRedactando(null)}
          onCreated={alRedactar}
        />
      ) : null}
    </>
  );
}
