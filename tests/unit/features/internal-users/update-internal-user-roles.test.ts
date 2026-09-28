import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

import { updateInternalUserRoles } from "@/features/internal-users/services";
import { apiRequest } from "@/shared/api/client";

const mockedApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue({} as never);
});

/**
 * El contrato de `PATCH /internal/users/:id/roles` es `{ roles, reason }`: el portal mandaba sólo
 * `{ roles }` y el backend lo rechazaba siempre con 400.
 */
describe("updateInternalUserRoles", () => {
  it("manda los roles y el motivo que exige el backend", async () => {
    await updateInternalUserRoles("9", {
      roles: ["QA_ENGINEER"],
      reason: "Pasa al equipo de QA",
    });

    expect(mockedApiRequest).toHaveBeenCalledWith("/internal/users/9/roles", {
      method: "PATCH",
      body: { roles: ["QA_ENGINEER"], reason: "Pasa al equipo de QA" },
    });
  });
});
