import { describe, expect, it } from "vitest";
import {
  getGoalTutorials,
  getTutorial,
  getTutorialForError,
  getTutorialsByModule,
  knownErrorCodes,
  tutorialCatalog,
} from "@/features/qa-tutorials/catalog";
import {
  allErrorExplanations,
  classifyHttpStatus,
} from "@/features/qa-tutorials/error-catalog";
import { allFieldHelp } from "@/features/qa-tutorials/field-help-catalog";

describe("catálogo de tutoriales · integridad", () => {
  it("tiene ids únicos y estables", () => {
    const ids = tutorialCatalog.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada tutorial tiene pasos, ruta y título", () => {
    for (const t of tutorialCatalog) {
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.route).toMatch(/^\/internal\/qa/);
      expect(t.title.length).toBeGreaterThan(0);
      for (const step of t.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.content.length).toBeGreaterThan(0);
      }
    }
  });

  it("cubre las herramientas reales auditadas", () => {
    const ids = tutorialCatalog.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "qa-lab-overview",
        "qa-lab-functional",
        "qa-lab-stress",
        "qa-lab-journey",
        "qa-suites-list",
        "qa-suite-detail",
        "qa-runs-interpret",
        "qa-stress-profile",
      ]),
    );
  });

  it("getTutorial / getTutorialsByModule resuelven", () => {
    expect(getTutorial("qa-lab-functional")?.module).toBe("Laboratorio");
    expect(getTutorial("no-existe")).toBeUndefined();
    expect(getTutorialsByModule("Suites").length).toBeGreaterThan(0);
  });

  it("los tutoriales con objetivo alimentan el launcher", () => {
    const goals = getGoalTutorials();
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((t) => Boolean(t.goal))).toBe(true);
  });

  it("cada código de error del catálogo enlaza a un paso existente", () => {
    for (const code of knownErrorCodes()) {
      const link = getTutorialForError(code);
      expect(link).toBeDefined();
      const tutorial = getTutorial(link!.tutorialId);
      expect(tutorial).toBeDefined();
      expect(tutorial!.steps[link!.stepIndex]).toBeDefined();
    }
  });

  it("todo error catalogado tiene explicación didáctica completa", () => {
    for (const explanation of allErrorExplanations()) {
      expect(explanation.title.length).toBeGreaterThan(0);
      expect(explanation.likelyCauses.length).toBeGreaterThan(0);
      expect(explanation.fixSteps.length).toBeGreaterThan(0);
      expect(explanation.recommendedAction.length).toBeGreaterThan(0);
    }
  });

  it("cada ayuda de campo tiene tooltip y guía", () => {
    for (const help of allFieldHelp()) {
      expect(help.tooltip.length).toBeGreaterThan(0);
      expect(help.help.length).toBeGreaterThan(0);
    }
  });

  it("classifyHttpStatus mapea estados a códigos con ayuda", () => {
    expect(classifyHttpStatus(401)).toBe("HTTP_401");
    expect(classifyHttpStatus(403)).toBe("HTTP_401");
    expect(classifyHttpStatus(404)).toBe("HTTP_404");
    expect(classifyHttpStatus(500)).toBe("HTTP_500");
    expect(classifyHttpStatus(503)).toBe("HTTP_500");
    expect(classifyHttpStatus(200)).toBeUndefined();
    // Todo código devuelto debe existir en el catálogo de explicaciones.
    for (const status of [401, 403, 404, 500, 502]) {
      const code = classifyHttpStatus(status);
      expect(knownErrorCodes()).toContain(code);
    }
  });
});
