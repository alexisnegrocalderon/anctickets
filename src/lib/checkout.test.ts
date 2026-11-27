import { describe, expect, it } from "vitest";
import { friendlyRpcError } from "./checkout";

describe("friendlyRpcError: productora suspendida", () => {
  it("traduce ORGANIZER_SUSPENDED a un mensaje claro", () => {
    const err = friendlyRpcError("ORGANIZER_SUSPENDED");
    expect(err?.message).toBe("Las ventas de este evento no están disponibles por ahora.");
    expect(err?.status).toBe(403);
  });
  it("sigue traduciendo los demás errores y devuelve null para los desconocidos", () => {
    expect(friendlyRpcError("CODE_EXHAUSTED")?.status).toBe(409);
    expect(friendlyRpcError("algo raro")).toBeNull();
  });
});
