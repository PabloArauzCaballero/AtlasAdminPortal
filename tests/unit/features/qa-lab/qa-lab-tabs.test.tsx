import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SUB_BY_SLUG,
  TAB_BY_SLUG,
  TABS,
  UNIT_TABS,
  slugOf,
  useUrlTabs,
} from "@/features/qa-lab/qa-lab-tabs";

const { replace, search } = vi.hoisted(() => ({
  replace: vi.fn(),
  search: { value: "" },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/qa/lab",
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

/**
 * Las pestañas del Lab viven en la URL para que el tutorial pueda abrirlas y
 * para que un F5 no las pierda. Aquí se prueba el mapeo slug↔etiqueta y que
 * cambiar de pestaña escribe la URL (con `replace`, sin ensuciar el historial).
 */
describe("useUrlTabs", () => {
  beforeEach(() => {
    replace.mockReset();
    search.value = "";
  });

  it("sin parámetros cae a la primera pestaña y subpestaña", () => {
    const { result } = renderHook(() => useUrlTabs());
    expect(result.current.activeTab).toBe(TABS[0]);
    expect(result.current.unitTab).toBe(UNIT_TABS[0]);
  });

  it("lee tab y sub de la URL; un slug desconocido cae a la primera", () => {
    search.value = "tab=arbol&sub=carga";
    expect(renderHook(() => useUrlTabs()).result.current).toMatchObject({
      activeTab: TAB_BY_SLUG.arbol,
      unitTab: SUB_BY_SLUG.carga,
    });
    search.value = "tab=loquesea";
    expect(renderHook(() => useUrlTabs()).result.current.activeTab).toBe(
      TABS[0],
    );
  });

  it("cambiar de pestaña reescribe la URL conservando los demás parámetros", () => {
    search.value = "endpointId=91&sub=carga";
    const { result } = renderHook(() => useUrlTabs());
    act(() => result.current.setActiveTab(TABS[1]));
    expect(replace).toHaveBeenCalledWith(
      "/internal/qa/lab?endpointId=91&sub=carga&tab=journey",
      { scroll: false },
    );
    act(() => result.current.setUnitTab(UNIT_TABS[0]));
    expect(replace).toHaveBeenLastCalledWith(
      "/internal/qa/lab?endpointId=91&sub=funcional",
      { scroll: false },
    );
  });

  it("slugOf devuelve la clave de una etiqueta y cadena vacía si no existe", () => {
    expect(slugOf(TAB_BY_SLUG, TABS[2])).toBe("arbol");
    expect(slugOf(SUB_BY_SLUG, "Nada")).toBe("");
  });
});
