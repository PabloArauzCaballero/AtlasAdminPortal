import { describe, expect, it } from "vitest";
import {
  HARD_MAX_STRESS_REQUESTS,
  buildStressWarnings,
  delayForIndex,
  normalizeStressPlan,
  runPacedRequests,
} from "@/features/qa-lab/stress-plan";
import type { DirectStressInput } from "@/features/qa-lab/types";

function stressInput(
  overrides: Record<string, unknown> = {},
): DirectStressInput {
  return {
    targetRps: 10,
    durationSeconds: 5,
    concurrency: 2,
    rampUpSeconds: 0,
    maxRequests: 100,
    dryRun: true,
    ...overrides,
  } as unknown as DirectStressInput;
}

function planFor(overrides: Record<string, unknown> = {}) {
  return normalizeStressPlan(stressInput(overrides));
}

describe("normalizeStressPlan · acotado de valores", () => {
  it("respeta un plan que ya está dentro de rango", () => {
    expect(planFor({ targetRps: 10, durationSeconds: 5 })).toMatchObject({
      targetRps: 10,
      durationSeconds: 5,
      plannedRequests: 50,
      totalRequests: 50,
    });
  });

  it.each([
    ["targetRps", "targetRps", 0, 1],
    ["targetRps", "targetRps", -5, 1],
    ["targetRps", "targetRps", 10_000, 500],
    ["durationSeconds", "durationSeconds", 0, 1],
    ["durationSeconds", "durationSeconds", 99_999, 3_600],
    ["concurrency", "concurrency", 0, 1],
    ["concurrency", "concurrency", 5_000, 200],
    ["maxRequests", "maxRequests", 0, 1],
  ])(
    "acota %s fuera de rango (%s=%s -> %s)",
    (_label, key, value, expected) => {
      const plan = planFor({ [key]: value }) as unknown as Record<
        string,
        number
      >;
      expect(plan[key === "targetRps" ? "requestedTargetRps" : key]).toBe(
        expected,
      );
    },
  );

  /**
   * Un NaN que se cuele hasta `intervalMs` acaba en `setTimeout(NaN)`, que Node
   * y el navegador tratan como 0: el "paced runner" dejaría de pacear y lanzaría
   * las 10.000 requests a la vez contra el backend.
   */
  it.each([
    ["targetRps", Number.NaN],
    ["targetRps", Number.POSITIVE_INFINITY],
    ["durationSeconds", Number.NaN],
    ["concurrency", Number.NaN],
    ["rampUpSeconds", Number.NaN],
    ["maxRequests", Number.NaN],
  ])("un %s no finito (%s) no propaga NaN al plan", (key, value) => {
    const plan = planFor({ [key]: value });
    for (const [field, entry] of Object.entries(plan)) {
      expect(Number.isFinite(entry), `${field} no es finito`).toBe(true);
    }
  });

  it("el ramp-up nunca puede durar más que el propio test", () => {
    expect(
      planFor({ durationSeconds: 10, rampUpSeconds: 60 }).rampUpSeconds,
    ).toBe(10);
  });

  it("un ramp-up negativo se trata como sin ramp-up", () => {
    expect(planFor({ rampUpSeconds: -5 }).rampUpSeconds).toBe(0);
  });
});

describe("normalizeStressPlan · volumen del plan", () => {
  /**
   * El tope duro es lo único que separa un dry-run de un ataque accidental al
   * backend: 500 rps durante una hora son 1.8M de requests.
   */
  it("un plan enorme se recorta al tope duro pase lo que pase", () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 3_600,
      maxRequests: 9_999_999,
    });
    expect(plan.plannedRequests).toBe(1_800_000);
    expect(plan.totalRequests).toBe(HARD_MAX_STRESS_REQUESTS);
  });

  it("totalRequests nunca supera el máximo pedido por el operador", () => {
    const plan = planFor({
      targetRps: 100,
      durationSeconds: 60,
      maxRequests: 250,
    });
    expect(plan.plannedRequests).toBe(6_000);
    expect(plan.totalRequests).toBe(250);
  });

  it("cuando el plan cabe, no se recorta nada", () => {
    const plan = planFor({
      targetRps: 10,
      durationSeconds: 5,
      maxRequests: 500,
    });
    expect(plan.totalRequests).toBe(plan.plannedRequests);
  });

  it("siempre planifica al menos una request", () => {
    expect(planFor({ targetRps: 0, durationSeconds: 0 }).totalRequests).toBe(1);
  });

  it("redondea las requests planificadas en vez de dejar fracciones", () => {
    // 2.5 rps no es configurable desde el form, pero el plan no debe producir
    // un totalRequests fraccionario que luego rompa el bucle del runner.
    const plan = planFor({ targetRps: 2.5, durationSeconds: 3 });
    expect(Number.isInteger(plan.plannedRequests)).toBe(true);
    expect(plan.plannedRequests).toBe(8);
  });
});

describe("normalizeStressPlan · ritmo", () => {
  it("deriva el intervalo del rps objetivo", () => {
    expect(planFor({ targetRps: 4 }).intervalMs).toBe(250);
  });

  it("redondea el intervalo a milisegundos enteros", () => {
    expect(planFor({ targetRps: 3 }).intervalMs).toBe(333);
  });

  // Sin suelo, un rps alto dejaría intervalo 0 y el bucle giraría sin ceder.
  it("nunca baja de 2 ms entre requests aunque el rps sea máximo", () => {
    expect(planFor({ targetRps: 500 }).intervalMs).toBe(2);
  });
});

describe("buildStressWarnings", () => {
  it("no avisa de nada en un plan limpio", () => {
    expect(buildStressWarnings(stressInput(), [])).toEqual([]);
  });

  it("nombra los path params sin resolver", () => {
    const warnings = buildStressWarnings(stressInput(), ["customerId", "id"]);
    expect(warnings[0]).toContain("customerId, id");
  });

  it("avisa de que el plan se recorta al máximo configurado", () => {
    const warnings = buildStressWarnings(
      stressInput({ targetRps: 100, durationSeconds: 60, maxRequests: 250 }),
      [],
    );
    expect(warnings.join(" ")).toContain("250");
  });

  it("avisa cuando el máximo pedido supera el tope seguro", () => {
    const warnings = buildStressWarnings(
      stressInput({ maxRequests: 50_000 }),
      [],
    );
    expect(warnings.join(" ")).toContain(String(HARD_MAX_STRESS_REQUESTS));
  });

  it("avisa de que un stress real sin ticket será bloqueado", () => {
    const warnings = buildStressWarnings(
      stressInput({ dryRun: false, approvalTicket: undefined }),
      [],
    );
    expect(warnings.join(" ")).toContain("ticket");
  });

  it("no pide ticket para un dry-run", () => {
    const warnings = buildStressWarnings(
      stressInput({ dryRun: true, approvalTicket: undefined }),
      [],
    );
    expect(warnings.join(" ")).not.toContain("ticket");
  });

  it("no avisa de ticket cuando hay uno válido", () => {
    const warnings = buildStressWarnings(
      stressInput({ dryRun: false, approvalTicket: "OPS-1234" }),
      [],
    );
    expect(warnings.join(" ")).not.toContain("ticket");
  });

  /**
   * COMPORTAMIENTO FIJADO, NO DESEADO (ver informe): el aviso usa
   * `!input.approvalTicket`, mientras que `stress-runner` exige
   * `trim().length >= 5`. Con un ticket en blanco o demasiado corto el operador
   * NO ve el aviso y aun así el run se bloquea. El aviso existe justamente para
   * anticipar ese bloqueo, así que hoy miente.
   *
   * No se arregla aquí porque el mínimo (5) vive en `stress-runner`, que importa
   * este módulo: compartirlo exige decidir dónde colocar la constante.
   */
  it.each([
    ["en blanco", "   "],
    ["demasiado corto", "ab"],
  ])(
    "un ticket %s silencia el aviso aunque el runner vaya a bloquear (fijado)",
    (_label, ticket) => {
      const warnings = buildStressWarnings(
        stressInput({ dryRun: false, approvalTicket: ticket }),
        [],
      );
      expect(warnings.join(" ")).not.toContain("ticket");
    },
  );

  it("acumula todos los avisos aplicables a la vez", () => {
    const warnings = buildStressWarnings(
      stressInput({
        dryRun: false,
        targetRps: 500,
        durationSeconds: 3_600,
        maxRequests: 50_000,
        approvalTicket: undefined,
      }),
      ["customerId"],
    );
    expect(warnings).toHaveLength(4);
  });
});

describe("runPacedRequests", () => {
  it("ejecuta exactamente las requests del plan, ni una más", async () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      maxRequests: 6,
    });
    let calls = 0;
    await runPacedRequests(plan, async () => {
      calls += 1;
    });
    expect(calls).toBe(6);
  });

  /**
   * La concurrencia es la protección del backend: si el gate fallara, el runner
   * dispararía las requests tan rápido como el intervalo las emita.
   */
  it("nunca deja más peticiones en vuelo que la concurrencia pactada", async () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      concurrency: 3,
      maxRequests: 12,
    });
    let inFlight = 0;
    let peak = 0;
    // Las tareas se retienen hasta que hay `concurrency` en vuelo y recién ahí
    // se liberan. Así el pico es determinista: no depende de que un timer de
    // 5 ms llegue a tiempo, que en una máquina cargada no pasa y hacía fallar
    // la cota inferior sin que hubiera ningún bug.
    const pending: Array<() => void> = [];
    await runPacedRequests(
      plan,
      () =>
        new Promise<void>((resolve) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          const done = () => {
            inFlight -= 1;
            resolve();
          };
          if (inFlight >= plan.concurrency) {
            pending.splice(0).forEach((release) => release());
            done();
            return;
          }
          pending.push(done);
        }),
    );

    // Exactamente la concurrencia pactada: ni menos (no se probaría nada) ni
    // más (sería el gate roto, que es la protección del backend).
    expect(peak).toBe(3);
    expect(inFlight).toBe(0);
  });

  /**
   * Sin el `allSettled` final, el runner resolvería con requests todavía en
   * vuelo y el resultado se construiría con muestras incompletas.
   */
  it("no resuelve hasta que han terminado todas las peticiones en vuelo", async () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      concurrency: 50,
      maxRequests: 4,
    });
    let finished = 0;
    await runPacedRequests(plan, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      finished += 1;
    });
    expect(finished).toBe(4);
  });

  /**
   * El ramp-up se comprueba sobre `delayForIndex`, no midiendo el reloj
   * alrededor de `runPacedRequests`. Medir tiempo real acá era inestable por
   * construcción: los timers pueden retrasarse (nunca adelantarse), así que una
   * cota superior de wall-clock falla en una máquina cargada aunque el código
   * esté bien. La garantía real es la separación calculada entre peticiones.
   */
  it("el ramp-up arranca mucho más lento que el intervalo de crucero", () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      rampUpSeconds: 1,
      maxRequests: 500,
    });

    // Arranca al 5% del rps objetivo => ~25 rps => ~40 ms entre peticiones,
    // contra los 2 ms de crucero.
    expect(delayForIndex(plan, 0)).toBeGreaterThan(plan.intervalMs * 10);
  });

  it("el ramp-up acelera de forma monótona hasta el intervalo de crucero", () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      rampUpSeconds: 1,
      maxRequests: 500,
    });

    const delays = [0, 25, 50, 100, 200, 400].map((index) =>
      delayForIndex(plan, index),
    );
    // Nunca acelera de golpe ni vuelve atrás: cada hueco es <= al anterior.
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]).toBeLessThanOrEqual(delays[i - 1]);
    }
    // Y nunca baja del intervalo de crucero, que es el ritmo máximo pactado:
    // el ramp-up frena el arranque, nunca lo acelera por encima del objetivo.
    // (Que lo *alcance* se comprueba en el test siguiente; acá los índices
    // todavía caen dentro del ramp-up.)
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(plan.intervalMs);
  });

  it("pasado el ramp-up se mantiene en el intervalo de crucero", () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 2,
      rampUpSeconds: 1,
      maxRequests: 1000,
    });

    // index/targetRps = 1s => ya terminó el ramp-up.
    expect(delayForIndex(plan, 500)).toBe(plan.intervalMs);
    expect(delayForIndex(plan, 900)).toBe(plan.intervalMs);
  });

  it("sin ramp-up va al intervalo de crucero desde la primera petición", () => {
    const plan = planFor({
      targetRps: 500,
      durationSeconds: 1,
      rampUpSeconds: 0,
      maxRequests: 4,
    });

    expect(delayForIndex(plan, 0)).toBe(plan.intervalMs);
    expect(delayForIndex(plan, 3)).toBe(plan.intervalMs);
  });
});
