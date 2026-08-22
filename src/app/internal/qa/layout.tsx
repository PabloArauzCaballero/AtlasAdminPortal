import { TutorialProvider } from "@/features/qa-tutorials/tutorial-provider";

/**
 * El TutorialProvider vive en el layout de /internal/qa: los layouts de Next
 * persisten entre navegaciones hijas, así que el overlay y el progreso
 * sobreviven al cambiar de pestaña o de página dentro de QA LAB.
 */
export default function QaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <TutorialProvider>{children}</TutorialProvider>;
}
