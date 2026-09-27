import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  paymentFormSchema,
  reversalFormSchema,
  toPaymentInput,
  toReversalInput,
  toWriteOffInput,
  writeOffFormSchema,
} from "@/features/loans/loan-forms";
import {
  estadoCartera,
  explicarErrorDeCartera,
  motivoParaNoDesembolsar,
} from "@/features/loans/loan-labels";
import { formatRate } from "@/features/loans/loan-ui";
import { comoCorrida } from "@/features/runtime-jobs/services";
import { findRuntimeJob } from "@/features/runtime-jobs/runtime-job-catalog";

describe("paymentFormSchema: la regla de importe del servidor, en el campo", () => {
  const base = { paymentMethod: "cash" as const, externalReference: "" };

  it.each(["350", "350.5", "350.50", "0.01"])("acepta %s", (amount) => {
    expect(paymentFormSchema.safeParse({ ...base, amount }).success).toBe(true);
  });

  it.each(["", "0", "0.00", "-5", "350.505", "1,50", "abc"])(
    "rechaza «%s»",
    (amount) => {
      expect(paymentFormSchema.safeParse({ ...base, amount }).success).toBe(
        false,
      );
    },
  );

  it("la moneda sale del préstamo y la referencia vacía no viaja", () => {
    expect(
      toPaymentInput(
        { amount: " 100.00 ", paymentMethod: "qr", externalReference: "  " },
        "BOB",
      ),
    ).toEqual({ amount: "100.00", currencyCode: "BOB", paymentMethod: "qr" });
  });
});

describe("reverso y castigo exigen motivo; el castigo, además, explicación", () => {
  it("reverso sin motivo no pasa; con motivo y sin notas, sí", () => {
    expect(
      reversalFormSchema.safeParse({ reasonCode: "", notes: "" }).success,
    ).toBe(false);
    expect(
      reversalFormSchema.safeParse({ reasonCode: "chargeback", notes: "" })
        .success,
    ).toBe(true);
    expect(toReversalInput({ reasonCode: "chargeback", notes: " " })).toEqual({
      reasonCode: "chargeback",
    });
  });

  it("castigo sin notas no pasa: el servidor las rechaza vacías", () => {
    expect(
      writeOffFormSchema.safeParse({ reasonCode: "incobrable", notes: "" })
        .success,
    ).toBe(false);
    expect(
      toWriteOffInput({ reasonCode: "incobrable", notes: " gestión agotada " }),
    ).toEqual({ reasonCode: "incobrable", notes: "gestión agotada" });
  });
});

describe("motivoParaNoDesembolsar: la misma regla que assertDisbursable", () => {
  it("sólo aprobada y sin comercio pendiente ni negativo", () => {
    expect(
      motivoParaNoDesembolsar({ status: "approved", businessAcceptance: null }),
    ).toBeNull();
    expect(
      motivoParaNoDesembolsar({
        status: "approved",
        businessAcceptance: "accepted",
      }),
    ).toBeNull();
    expect(
      motivoParaNoDesembolsar({
        status: "approved",
        businessAcceptance: "pending",
      }),
    ).toMatch(/comercio/);
    expect(
      motivoParaNoDesembolsar({
        status: "approved",
        businessAcceptance: "declined",
      }),
    ).toMatch(/rechazó/);
    expect(
      motivoParaNoDesembolsar({
        status: "under_review",
        businessAcceptance: null,
      }),
    ).toMatch(/aprobada/);
  });
});

describe("lenguaje de la cartera", () => {
  it("traduce el código del servidor y no inventa nombres para uno desconocido", () => {
    expect(estadoCartera("written_off").label).toBe("Castigado");
    expect(estadoCartera("algo_nuevo")).toEqual({
      label: "algo_nuevo",
      tone: "default",
    });
  });

  it("explica el rechazo por su código, venga en `code` o en el mensaje", () => {
    const porMensaje = new AtlasApiError({
      status: 422,
      code: "UNPROCESSABLE_ENTITY",
      message: "PAYMENT_EXCEEDS_OUTSTANDING",
    });
    expect(explicarErrorDeCartera(porMensaje, "x")).toMatch(
      /supera lo pendiente/,
    );
    const prohibido = new AtlasApiError({
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden resource",
    });
    expect(explicarErrorDeCartera(prohibido, "x")).toMatch(/Tu rol/);
    expect(explicarErrorDeCartera(new Error("red"), "genérico")).toBe(
      "genérico",
    );
  });

  it("la tasa de previsión viaja como fracción", () => {
    expect(formatRate("0.05")).toBe("5 %");
    expect(formatRate(null)).toBe("—");
  });
});

describe("barrido de mora en Jobs de runtime", () => {
  it("llama a su ruta de cartera y no ofrece ensayo: el cuerpo es estricto", () => {
    const job = findRuntimeJob("sweep-loan-delinquency");
    expect(job?.path).toBe("/operations/loans/delinquency-sweep");
    expect(job?.supportsDryRun).toBe(false);
    expect(job?.fields.map((f) => [f.name, f.max])).toEqual([["limit", 1000]]);
  });

  it("un resultado a secas se envuelve como corrida sin id, en vez de «#undefined»", () => {
    expect(comoCorrida({ evaluated: 3, enqueued: 1 })).toEqual({
      jobRunId: null,
      status: "completed",
      result: { evaluated: 3, enqueued: 1 },
    });
    const corrida = { jobRunId: "9", status: "succeeded", result: {} };
    expect(comoCorrida(corrida)).toBe(corrida);
  });
});
