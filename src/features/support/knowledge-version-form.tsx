"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useCreateVersionMutation } from "./knowledge-hooks";
import { knowledgeErrorMessage, newIdempotencyKey } from "./knowledge-services";
import type { KnowledgeVersion } from "./knowledge-types";

/** «a, b ,c» → ["a","b","c"]; descarta vacíos y lo que el servidor rechazaría por corto. */
export function splitTerms(texto: string, maxLength: number): string[] {
  return texto
    .split(",")
    .map((termino) => termino.trim())
    .filter((termino) => termino.length >= 2 && termino.length <= maxLength);
}

/**
 * Una versión nueva del artículo. Nace en BORRADOR.
 *
 * «Cuándo escalar» es obligatorio porque así lo exige el servidor, y con razón: una guía que no dice
 * cuándo dejar de intentarlo sólo convierte a la persona en alguien que insiste con pasos que ya no
 * aplican a su caso.
 */
export function KnowledgeVersionForm({
  article,
  onClose,
  onCreated,
}: Readonly<{
  article: { articleId: string; articleKey: string };
  onClose: () => void;
  onCreated: (version: KnowledgeVersion) => void;
}>) {
  const crear = useCreateVersionMutation();
  const [clave, setClave] = useState(() =>
    newIdempotencyKey("knowledge-version"),
  );
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [body, setBody] = useState("");
  const [terms, setTerms] = useState("");
  const [escalateWhen, setEscalateWhen] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const errores = {
    title: title.trim().length < 4 ? "Mínimo 4 caracteres." : undefined,
    body: body.trim().length < 20 ? "Mínimo 20 caracteres." : undefined,
    escalateWhen:
      escalateWhen.trim().length < 10 ? "Mínimo 10 caracteres." : undefined,
    changeReason:
      changeReason.trim().length < 4 ? "Mínimo 4 caracteres." : undefined,
  };
  const listo =
    Object.values(errores).every((error) => !error) && !crear.isPending;
  const [intentado, setIntentado] = useState(false);
  const mostrar = (error: string | undefined) =>
    intentado ? error : undefined;

  return (
    <DrawerPanel
      open
      title={`Nueva versión de «${article.articleKey}»`}
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setIntentado(true);
          if (!listo) return;
          crear.mutate(
            {
              articleId: article.articleId,
              key: clave,
              body: {
                locale: "es-BO",
                title: title.trim(),
                question: question.trim() || undefined,
                shortAnswer: shortAnswer.trim() || undefined,
                bodyMarkdown: body.trim(),
                tags: [],
                canonicalQueryTerms: splitTerms(terms, 60),
                escalateWhen: escalateWhen.trim(),
                changeReason: changeReason.trim(),
              },
            },
            {
              onSuccess: (version) => {
                setClave(newIdempotencyKey("knowledge-version"));
                onCreated(version);
              },
            },
          );
        }}
      >
        <Field
          label="Título"
          tooltip="Lo primero que lee la persona en los resultados; escríbelo como ella describiría el problema."
          error={mostrar(errores.title)}
          required
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field
          label="Pregunta"
          tooltip="La duda tal como la formula el cliente, por ejemplo «¿Por qué no me llega el código?»."
        >
          <Input
            value={question}
            maxLength={300}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Field>
        <Field
          label="Respuesta corta"
          tooltip="Una o dos frases que resuelven la duda sin abrir el artículo completo."
        >
          <Textarea
            className="min-h-20"
            value={shortAnswer}
            maxLength={600}
            onChange={(e) => setShortAnswer(e.target.value)}
          />
        </Field>
        <Field
          label="Texto completo"
          tooltip="Los pasos detallados; admite formato Markdown con listas y negritas."
          error={mostrar(errores.body)}
          required
        >
          <Textarea
            className="min-h-40"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <Field
          label="Cómo lo busca la gente"
          tooltip="Palabras con las que la gente escribe este problema aunque el artículo diga otra cosa."
          hint="Separadas por comas, por ejemplo: no me llega el codigo, sms, otp."
        >
          <Input value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
        <Field
          label="Cuándo escalar"
          tooltip="En qué situación la persona debe dejar de seguir la guía y pedir ayuda a un agente."
          error={mostrar(errores.escalateWhen)}
          required
        >
          <Textarea
            className="min-h-20"
            value={escalateWhen}
            onChange={(e) => setEscalateWhen(e.target.value)}
          />
        </Field>
        <Field
          label="Motivo del cambio"
          tooltip="Qué cambia respecto a lo publicado y por qué; lo lee quien revisa y aprueba."
          error={mostrar(errores.changeReason)}
          required
        >
          <Input
            value={changeReason}
            maxLength={400}
            onChange={(e) => setChangeReason(e.target.value)}
          />
        </Field>

        {crear.error ? (
          <ErrorState
            title="No se guardó la versión."
            description={knowledgeErrorMessage(crear.error)}
          />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={crear.isPending}>
            Guardar borrador
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
