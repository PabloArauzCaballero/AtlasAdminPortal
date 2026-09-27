"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useCreateArticleMutation } from "./knowledge-hooks";
import { knowledgeErrorMessage, newIdempotencyKey } from "./knowledge-services";
import {
  AUDIENCIA_OPTIONS,
  EQUIPO_OPTIONS,
  EQUIPOS_CON_APROBADOR_DE_DOMINIO,
  SI_NO_OPTIONS,
  type CreatedArticle,
  type KnowledgeAudience,
} from "./knowledge-types";

const CLAVE_VALIDA = /^[a-z0-9][a-z0-9-]{2,119}$/;

/**
 * Crear el artículo: su clave, a quién va dirigido y qué equipo responde por él.
 *
 * El texto NO se escribe aquí: llega con la primera versión, que es lo que después se revisa y se
 * aprueba. Al terminar, la pantalla abre directamente el formulario de esa primera versión, porque
 * un artículo sin versión no aparece en ningún sitio.
 */
export function KnowledgeArticleForm({
  onClose,
  onCreated,
}: Readonly<{
  onClose: () => void;
  onCreated: (article: CreatedArticle) => void;
}>) {
  const crear = useCreateArticleMutation();
  const [clave, setClave] = useState(() =>
    newIdempotencyKey("knowledge-article"),
  );
  const [articleKey, setArticleKey] = useState("");
  const [audience, setAudience] = useState<string>("AUTHENTICATED_CONSUMER");
  const [ownerTeam, setOwnerTeam] = useState("support");
  const [isFaq, setIsFaq] = useState("no");
  const [reviewCycleDays, setReviewCycleDays] = useState("180");

  const dias = Number(reviewCycleDays);
  const claveOk = CLAVE_VALIDA.test(articleKey.trim());
  const diasOk = Number.isInteger(dias) && dias >= 30 && dias <= 1095;
  const listo = claveOk && diasOk && !crear.isPending;

  return (
    <DrawerPanel open title="Crear un artículo de ayuda" onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!listo) return;
          crear.mutate(
            {
              key: clave,
              body: {
                articleKey: articleKey.trim(),
                audience: audience as KnowledgeAudience,
                ownerTeam,
                isFaq: isFaq === "si",
                isFeatured: false,
                reviewCycleDays: dias,
              },
            },
            {
              onSuccess: (article) => {
                setClave(newIdempotencyKey("knowledge-article"));
                onCreated(article);
              },
            },
          );
        }}
      >
        <Field
          label="Clave del artículo"
          tooltip="Nombre corto y estable con el que la app enlaza el artículo; no cambia aunque cambie el título."
          hint="Minúsculas, dígitos y guiones, por ejemplo «no-me-llega-el-codigo»."
          error={
            articleKey && !claveOk
              ? "Usa entre 3 y 120 caracteres: minúsculas, dígitos y guiones, empezando por letra o dígito."
              : undefined
          }
          required
        >
          <Input
            value={articleKey}
            onChange={(event) => setArticleKey(event.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Quién lo lee"
          tooltip="Decide dónde aparece: la app, el portal del comercio o sólo el equipo interno."
        >
          <Select
            name="audiencia"
            options={AUDIENCIA_OPTIONS}
            value={audience}
            onChange={setAudience}
          />
        </Field>

        <Field
          label="Equipo responsable"
          tooltip="Qué equipo responde por lo que dice el artículo; algunos exigen aprobación de riesgo o cumplimiento."
          hint={
            EQUIPOS_CON_APROBADOR_DE_DOMINIO.includes(ownerTeam)
              ? "Sus versiones las aprueba alguien de riesgo o cumplimiento."
              : "Sus versiones las aprueba otra persona del equipo interno."
          }
        >
          <Select
            name="equipo"
            options={EQUIPO_OPTIONS}
            value={ownerTeam}
            onChange={setOwnerTeam}
          />
        </Field>

        <Field
          label="Pregunta frecuente"
          tooltip="Si además de encontrarse buscando aparece en la lista de preguntas frecuentes de la app."
        >
          <Select
            name="faq"
            options={SI_NO_OPTIONS}
            value={isFaq}
            onChange={setIsFaq}
          />
        </Field>

        <Field
          label="Revisar cada (días)"
          tooltip="Cada cuánto hay que volver a leerlo para confirmar que sigue siendo cierto."
          hint="Entre 30 y 1095 días. Por defecto, seis meses."
          error={
            reviewCycleDays && !diasOk
              ? "Pon un número entero entre 30 y 1095."
              : undefined
          }
        >
          <Input
            type="number"
            inputMode="numeric"
            min={30}
            max={1095}
            step={1}
            value={reviewCycleDays}
            onChange={(event) => setReviewCycleDays(event.target.value)}
          />
        </Field>

        {crear.error ? (
          <ErrorState
            title="No se creó el artículo."
            description={knowledgeErrorMessage(crear.error)}
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
            isLoading={crear.isPending}
          >
            Crear y redactar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
