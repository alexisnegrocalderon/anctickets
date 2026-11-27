import { describe, expect, it } from "vitest";
import {
  buildBlockers,
  confirmationMatches,
  deleteErrorMessage,
  expectedConfirmation,
  horaChile,
  isMissingFunctionError,
  maskEmail,
  normalizeProtectedEmails,
  parsePreview,
} from "./admin-delete";
import { removeStoragePrefix, type StorageLike } from "./admin-storage";

describe("normalizeProtectedEmails", () => {
  it("minúsculas, recorta, sin vacíos ni repetidos", () => {
    expect(normalizeProtectedEmails([" Admin@Test.cl ", "admin@test.cl", "", null, undefined, "B@x.cl"])).toEqual(["admin@test.cl", "b@x.cl"]);
  });
  it("lista vacía", () => expect(normalizeProtectedEmails([])).toEqual([]));
});

describe("maskEmail", () => {
  it("3 letras + *** + dominio", () => expect(maskEmail("prueba.borrar@example.com")).toBe("pru***@example.com"));
  it("usuario corto", () => expect(maskEmail("ab@x.cl")).toBe("ab***@x.cl"));
  it("sin correo válido: null", () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail("")).toBeNull();
    expect(maskEmail("sin-arroba")).toBeNull();
    expect(maskEmail("@x.cl")).toBeNull();
  });
  it("no deja el usuario completo", () => expect(maskEmail("administracion@x.cl")).not.toContain("administracion"));
});

describe("confirmationMatches", () => {
  it("coincide ignorando espacios en los extremos", () => expect(confirmationMatches("  Noche Neón SpA ", "Noche Neón SpA", "a@x.cl")).toBe(true));
  it("distingue mayúsculas", () => expect(confirmationMatches("noche neón spa", "Noche Neón SpA", null)).toBe(false));
  it("distingue tildes", () => expect(confirmationMatches("Noche Neon SpA", "Noche Neón SpA", null)).toBe(false));
  it("acepta tilde descompuesta (NFD) igual a la compuesta", () => expect(confirmationMatches("Noche Neón SpA", "Noche Neón SpA", null)).toBe(true));
  it("no colapsa espacios internos", () => expect(confirmationMatches("Noche  Neón SpA", "Noche Neón SpA", null)).toBe(false));
  it("sin nombre pide el correo completo", () => {
    expect(expectedConfirmation("   ", "demo@test.cl")).toBe("demo@test.cl");
    expect(confirmationMatches("demo@test.cl", null, "demo@test.cl")).toBe(true);
    expect(confirmationMatches("dem***@test.cl", null, "demo@test.cl")).toBe(false);
  });
  it("texto vacío o sin nada que comparar: nunca coincide", () => {
    expect(confirmationMatches("", "Demo", null)).toBe(false);
    expect(confirmationMatches("", null, null)).toBe(false);
    expect(confirmationMatches("   ", "  ", "  ")).toBe(false);
    expect(confirmationMatches(null, "Demo", null)).toBe(false);
  });
});

describe("buildBlockers", () => {
  it("sin bloqueos: lista vacía", () => expect(buildBlockers({ bloqueos: [], conteos: {} })).toEqual([]));
  it("ventas con conteo y la salida 'solo suspender'", () => {
    const [b] = buildBlockers({ bloqueos: ["con_ventas"], conteos: { ventas: 3 } });
    expect(b.message).toContain("3 ventas registradas");
    expect(b.message).toContain("solo suspender");
  });
  it("singular", () => expect(buildBlockers({ bloqueos: ["con_ventas"], conteos: { ventas: 1 } })[0].message).toContain("1 venta registrada"));
  it("pendiente con hora de Chile", () => {
    const iso = "2026-07-01T06:54:00Z"; // invierno de Chile: UTC-4
    const [b] = buildBlockers({ bloqueos: ["compras_pendientes"], conteos: { pendientes: 1, pendientes_vence_en: iso } });
    expect(b.message).toBe(`Tiene 1 compra pendiente que vence a las ${horaChile(iso)}: espera a que expire.`);
    expect(horaChile(iso)).toBe("02:54");
  });
  it("pendientes en plural", () => expect(buildBlockers({ bloqueos: ["compras_pendientes"], conteos: { pendientes: 2 } })[0].message).toContain("2 compras pendientes"));
  it("cuenta protegida y comprador, en orden de importancia, con mensajes distintos", () => {
    const list = buildBlockers({ bloqueos: ["con_ventas_como_comprador", "cuenta_protegida", "compras_pendientes"], conteos: { ventas_comprador: 2, pendientes: 1 } });
    expect(list.map((b) => b.key)).toEqual(["cuenta_protegida", "con_ventas_como_comprador", "compras_pendientes"]);
    expect(new Set(list.map((b) => b.message)).size).toBe(3);
    expect(list[0].message).toContain("administración");
  });
});

describe("deleteErrorMessage", () => {
  it("un mensaje distinto por cada excepción", () => {
    const codes = ["CONFIRMATION_MISMATCH", "HAS_SALES", "HAS_PENDING_ORDERS", "PROTECTED_ACCOUNT", "ORGANIZER_NOT_FOUND", "ADMIN_EMAIL_REQUIRED", "FORBIDDEN"];
    const msgs = codes.map((c) => deleteErrorMessage(`ERROR: ${c}`));
    expect(new Set(msgs).size).toBe(codes.length);
  });
  it("error desconocido: genérico y sin filtrar detalles", () => {
    const m = deleteErrorMessage("duplicate key value violates something secret");
    expect(m).not.toContain("secret");
    expect(m).toContain("No se pudo borrar");
  });
});

describe("parsePreview / isMissingFunctionError", () => {
  it("forma válida", () => {
    const p = parsePreview({ existe: true, nombre: "X", correo_enmascarado: "x**@a.cl", puede_borrar: true, bloqueos: [], conteos: { eventos: 2 } });
    expect(p?.puede_borrar).toBe(true);
    expect(p?.conteos.eventos).toBe(2);
  });
  it("puede_borrar nunca es true con bloqueos", () => {
    expect(parsePreview({ existe: true, puede_borrar: true, bloqueos: ["con_ventas"], conteos: {} })?.puede_borrar).toBe(false);
  });
  it("ignora claves desconocidas y rechaza formas inválidas", () => {
    expect(parsePreview({ existe: true, puede_borrar: false, bloqueos: ["otra"], conteos: {} })?.bloqueos).toEqual([]);
    expect(parsePreview(null)).toBeNull();
    expect(parsePreview({ foo: 1 })).toBeNull();
  });
  it("detecta función inexistente (migración sin aplicar)", () => {
    expect(isMissingFunctionError("Could not find the function public.admin_organizer_delete_preview in the schema cache")).toBe(true);
    expect(isMissingFunctionError("permission denied")).toBe(false);
  });
});

describe("removeStoragePrefix", () => {
  function fake(tree: Record<string, { name: string; id: string | null }[]>, failRemove = false): { s: StorageLike; removed: string[] } {
    const removed: string[] = [];
    const s: StorageLike = {
      from: () => ({
        list: async (path) => ({ data: tree[path] ?? [], error: null }),
        remove: async (paths) => {
          if (failRemove) return { error: { message: "boom" } };
          removed.push(...paths);
          return { error: null };
        },
      }),
    };
    return { s, removed };
  }
  it("borra todo bajo el prefijo de la productora, incluidas subcarpetas", async () => {
    const { s, removed } = fake({
      org1: [{ name: "ev1", id: null }, { name: "logo.png", id: "f0" }],
      "org1/ev1": [{ name: "a.jpg", id: "f1" }, { name: "b.jpg", id: "f2" }],
    });
    const r = await removeStoragePrefix(s, "event-images", "org1");
    expect(r).toEqual({ removed: 3, failed: false });
    expect(removed.sort()).toEqual(["org1/ev1/a.jpg", "org1/ev1/b.jpg", "org1/logo.png"]);
  });
  it("un fallo no lanza: se informa", async () => {
    const { s } = fake({ org1: [{ name: "a.jpg", id: "f1" }] }, true);
    expect(await removeStoragePrefix(s, "event-images", "org1")).toEqual({ removed: 0, failed: true });
  });
  it("si list lanza, tampoco lanza", async () => {
    const s: StorageLike = { from: () => ({ list: async () => { throw new Error("x"); }, remove: async () => ({ error: null }) }) };
    expect((await removeStoragePrefix(s, "event-images", "org1")).failed).toBe(true);
  });
});
