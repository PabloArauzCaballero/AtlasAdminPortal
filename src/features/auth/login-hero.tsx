import {
  DatabaseZap,
  FlaskConical,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { AnimatedBackground } from "@/shared/components/layout/animated-background";

const MODULES = [
  { icon: ServerCog, label: "Systems Ops", note: "Salud en vivo" },
  { icon: FlaskConical, label: "QA Lab", note: "Pruebas reales" },
  { icon: DatabaseZap, label: "Catálogo", note: "Metadata" },
  { icon: ShieldCheck, label: "Auditoría", note: "Trazabilidad" },
];

/** Panel institucional del login: identidad, mensaje y módulos del sistema. */
export function LoginHero() {
  return (
    <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 text-white lg:flex">
      <AnimatedBackground variant="auth" interactive />

      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-lg font-semibold shadow-lg backdrop-blur">
          A
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em]">ATLAS</p>
          <p className="text-[0.6875rem] text-slate-400">Portal interno</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[#9AABEF] animate-float-in">
          Control operativo
        </p>
        <h2 className="text-gradient text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.035em] animate-float-in [animation-delay:80ms]">
          Sistemas, QA y gobierno de datos en un solo lugar.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400 animate-float-in [animation-delay:160ms]">
          Monitorea catálogos, calidad de datos, lineage y auditoría conectados
          en tiempo real al servicio interno de ATLAS.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-2.5">
          {MODULES.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <li
                key={mod.label}
                className="glass-dark flex items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 animate-float-in"
                style={{ animationDelay: `${240 + index * 70}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#9AABEF]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white">
                    {mod.label}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-slate-400">
                    {mod.note}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="relative text-[0.6875rem] text-slate-500">
        © {new Date().getFullYear()} ATLAS · Uso interno
      </p>
    </section>
  );
}
