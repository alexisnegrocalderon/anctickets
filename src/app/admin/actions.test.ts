import { beforeEach, describe, expect, it, vi } from "vitest";

// La acción no debe tocar la base si quien llama no es admin: requireAdmin responde 404.
const requireAdmin = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/admin", () => ({ requireAdmin: () => requireAdmin(), getAdminEmails: () => ["admin@test.cl"] }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { organizer_name: "Demo", email: "demo@test.cl" } }) }) }) }),
    storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) },
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { deleteOrganizer } from "./actions";

const ORG = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  requireAdmin.mockReset();
  rpc.mockReset();
});

describe("deleteOrganizer", () => {
  it("sin admin: lanza (404) y no llama a la base", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));
    await expect(deleteOrganizer(ORG, "Demo")).rejects.toThrow("404");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rechaza ids inválidos y el propio admin", async () => {
    requireAdmin.mockResolvedValue({ id: ORG, email: "admin@test.cl" });
    expect((await deleteOrganizer("no-es-uuid", "Demo"))?.error).toBeTruthy();
    expect((await deleteOrganizer(ORG, "Demo"))?.error).toContain("administración");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("confirmación errónea: no llama a la función SQL", async () => {
    requireAdmin.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "admin@test.cl" });
    const r = await deleteOrganizer(ORG, "otro nombre");
    expect(r?.error).toContain("no coincide");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("éxito: pasa lista de protegidos y correo del admin, y redirige con el aviso", async () => {
    requireAdmin.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "admin@test.cl" });
    rpc.mockResolvedValue({ data: { nombre: "Demo" }, error: null });
    await expect(deleteOrganizer(ORG, " Demo ")).rejects.toThrow("NEXT_REDIRECT:/admin/productoras?borrada=Demo");
    expect(rpc).toHaveBeenCalledWith("admin_delete_organizer", {
      p_organizer_id: ORG,
      p_confirm: "Demo",
      p_admin_email: "admin@test.cl",
      p_protected_emails: ["admin@test.cl"],
    });
  });
  it("error de la función: devuelve el mensaje específico y no redirige", async () => {
    requireAdmin.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "admin@test.cl" });
    rpc.mockResolvedValue({ data: null, error: { message: "HAS_SALES" } });
    expect((await deleteOrganizer(ORG, "Demo"))?.error).toContain("ventas");
  });
});
