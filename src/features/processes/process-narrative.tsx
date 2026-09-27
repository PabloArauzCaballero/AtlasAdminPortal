import { CircleCheck, CircleX } from "lucide-react";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { ProcessDetail } from "./types";

const QUESTIONS = [
  { key: "whyExists", title: "¿Por qué existe?" },
  { key: "whoStartsAndCloses", title: "¿Quién lo empieza y quién lo cierra?" },
  { key: "startAndEnd", title: "¿Cuándo empieza y cuándo termina?" },
  { key: "whenItFails", title: "¿Qué pasa cuando falla?" },
  { key: "healthIndicator", title: "¿Cómo se sabe que va bien?" },
] as const;

/** Las cinco preguntas que un proceso tiene que contestar, y cómo se ve que salió bien o mal. */
export function ProcessNarrative({
  process,
}: Readonly<{ process: ProcessDetail }>) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <SectionHeader
          title="El proceso en cinco preguntas"
          description="Lo que cualquiera del equipo tiene que saber antes de tocarlo."
        />
      </CardHeader>
      <CardContent>
        <dl className="grid gap-5 md:grid-cols-2">
          {QUESTIONS.map((question) => (
            <div key={question.key}>
              <dt className="text-sm font-semibold text-atlas-text">
                {question.title}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-atlas-muted">
                {process.narrative[question.key] || "Sin contestar todavía."}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Outcome ok title="Cuando sale bien" text={process.success} />
          <Outcome ok={false} title="Cuando sale mal" text={process.failure} />
        </div>
      </CardContent>
    </Card>
  );
}

function Outcome({
  ok,
  title,
  text,
}: Readonly<{ ok: boolean; title: string; text: string }>) {
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <div
      className={
        ok
          ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          : "rounded-xl border border-red-200 bg-red-50 p-4"
      }
    >
      <p
        className={
          ok
            ? "flex items-center gap-2 text-sm font-semibold text-emerald-800"
            : "flex items-center gap-2 text-sm font-semibold text-red-800"
        }
      >
        <Icon className="h-4 w-4" aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 text-atlas-text">{text}</p>
    </div>
  );
}
