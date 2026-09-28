import { describe, expect, it } from "vitest";
import {
  formatJobDuration,
  JOB_STATUS_OPTIONS,
  jobDisplayName,
  jobQueueLabel,
} from "@/features/operational-jobs/labels";

/**
 * La lista de corridas enseñaba el código del job con espacios («deliver pending notifications»),
 * la duración en milisegundos crudos y un desplegable de estados armado con la página visible.
 */
describe("etiquetas de corridas", () => {
  it("nombra el proceso con el título del catálogo de jobs de runtime", () => {
    expect(
      jobDisplayName(
        "deliver_pending_notifications",
        "deliver pending notifications",
      ),
    ).toBe("Entregar notificaciones pendientes");
    expect(
      jobDisplayName(
        "run_notification_campaigns",
        "run notification campaigns",
      ),
    ).toBe("Enviar campañas programadas");
    expect(jobDisplayName("desconocido_x", "desconocido x")).toBe(
      "desconocido x",
    );
  });

  it("el origen se dice en español y lo desconocido se deja tal cual", () => {
    expect(jobQueueLabel("system")).toBe("Programada");
    expect(jobQueueLabel("internal_user")).toBe("Manual");
    expect(jobQueueLabel("otro")).toBe("otro");
    expect(jobQueueLabel(null)).toBe("—");
  });

  it("formatea la duración a una unidad legible", () => {
    expect(formatJobDuration(null)).toBe("—");
    expect(formatJobDuration(850)).toBe("850 ms");
    expect(formatJobDuration(12_400)).toBe("12,4 s");
    expect(formatJobDuration(185_000)).toBe("3 min 5 s");
  });

  it("ofrece «Fallida» aunque la página visible no tenga ninguna", () => {
    expect(JOB_STATUS_OPTIONS.map((option) => option.value)).toContain(
      "FAILED",
    );
  });
});
