import { afterEach, describe, expect, it, vi } from "vitest";
import { decideAdminAccess, extractAmrMethods, getAdminEmails, hasVerifiedEmail, isAdminEmail, isAdminUser, parseAdminEmails } from "./admin";

afterEach(() => vi.unstubAllEnvs());

describe("parseAdminEmails", () => {
  it("separa por comas, recorta espacios y pasa a minúsculas", () => {
    expect(parseAdminEmails(" Admin@Test.cl , otra@test.CL ")).toEqual(["admin@test.cl", "otra@test.cl"]);
  });
  it("vacío, solo espacios o solo comas: lista vacía", () => {
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
    expect(parseAdminEmails(" , ,, ")).toEqual([]);
  });
  it("ausente: lista vacía", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
  });
  it("quita repetidos aunque cambien las mayúsculas", () => {
    expect(parseAdminEmails("a@test.cl,A@TEST.cl, a@test.cl")).toEqual(["a@test.cl"]);
  });
});

describe("isAdminEmail", () => {
  it("lee ADMIN_EMAILS y no distingue mayúsculas", () => {
    vi.stubEnv("ADMIN_EMAILS", "Admin@Test.cl, otra@test.cl");
    expect(getAdminEmails()).toEqual(["admin@test.cl", "otra@test.cl"]);
    expect(isAdminEmail("ADMIN@test.cl")).toBe(true);
    expect(isAdminEmail("  otra@test.cl ")).toBe(true);
    expect(isAdminEmail("intruso@test.cl")).toBe(false);
  });
  it("sin correo: false", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
  });
  it("falla cerrado con ADMIN_EMAILS vacío o ausente", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@test.cl")).toBe(false);
    vi.stubEnv("ADMIN_EMAILS", undefined as unknown as string);
    expect(isAdminEmail("admin@test.cl")).toBe(false);
  });
  it("no acepta coincidencias parciales", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    expect(isAdminEmail("admin@test.cl.evil.com")).toBe(false);
    expect(isAdminEmail("xadmin@test.cl")).toBe(false);
  });
});

describe("hasVerifiedEmail / isAdminUser", () => {
  it("exige correo confirmado o proveedor Google", () => {
    expect(hasVerifiedEmail(null)).toBe(false);
    expect(hasVerifiedEmail({ email_confirmed_at: undefined, app_metadata: {} })).toBe(false);
    expect(hasVerifiedEmail({ email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {} })).toBe(true);
    expect(hasVerifiedEmail({ app_metadata: { provider: "google" } })).toBe(true);
    expect(hasVerifiedEmail({ app_metadata: { provider: "email", providers: ["email", "google"] } })).toBe(true);
  });
  it("admin = en la lista Y verificado", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    const base = { email: "admin@test.cl", app_metadata: {} };
    expect(isAdminUser({ ...base, email_confirmed_at: "2026-01-01T00:00:00Z" })).toBe(true);
    expect(isAdminUser(base)).toBe(false);
    expect(isAdminUser({ email: "otro@test.cl", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {} })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});

describe("decideAdminAccess (tabla de decisión)", () => {
  const base = { isAdmin: true, amrMethods: [] as string[] | null | undefined, aal: "aal1" as string | null | undefined, hasVerifiedTotp: false };

  it("no admin: siempre deny, aunque tenga oauth o aal2", () => {
    for (const amrMethods of [["oauth"], ["password"], [], undefined, null]) {
      for (const aal of ["aal1", "aal2", null, undefined]) {
        for (const hasVerifiedTotp of [true, false]) {
          expect(decideAdminAccess({ isAdmin: false, amrMethods, aal, hasVerifiedTotp })).toBe("deny");
        }
      }
    }
  });
  it("oauth (Google): allow con o sin factor enrolado, con cualquier aal", () => {
    for (const aal of ["aal1", "aal2", null, undefined]) {
      for (const hasVerifiedTotp of [true, false]) {
        expect(decideAdminAccess({ ...base, amrMethods: ["oauth"], aal, hasVerifiedTotp })).toBe("allow");
      }
    }
  });
  it("oauth junto a otros métodos: allow", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["password", "oauth", "totp"], aal: "aal2" })).toBe("allow");
  });
  it("aal2 sin oauth (clave + código): allow", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["password", "totp"], aal: "aal2", hasVerifiedTotp: true })).toBe("allow");
    expect(decideAdminAccess({ ...base, amrMethods: ["password"], aal: "aal2" })).toBe("allow");
  });
  it("aal2 con amr vacío o ausente: allow (lo decide el aal verificado)", () => {
    expect(decideAdminAccess({ ...base, amrMethods: [], aal: "aal2" })).toBe("allow");
    expect(decideAdminAccess({ ...base, amrMethods: undefined, aal: "aal2" })).toBe("allow");
    expect(decideAdminAccess({ ...base, amrMethods: null, aal: "aal2" })).toBe("allow");
  });
  it("clave sola (aal1) con factor verificado: verify", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["password"], aal: "aal1", hasVerifiedTotp: true })).toBe("verify");
  });
  it("clave sola (aal1) sin factor: deny", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["password"], aal: "aal1", hasVerifiedTotp: false })).toBe("deny");
  });
  it("amr vacío o ausente y aal1/ausente: sin garantías, verify o deny según el factor", () => {
    for (const amrMethods of [[], undefined, null]) {
      for (const aal of ["aal1", null, undefined]) {
        expect(decideAdminAccess({ ...base, amrMethods, aal, hasVerifiedTotp: true })).toBe("verify");
        expect(decideAdminAccess({ ...base, amrMethods, aal, hasVerifiedTotp: false })).toBe("deny");
      }
    }
  });
  it("método parecido a oauth no cuenta (solo 'oauth' exacto)", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["OAuth", "oauth2", "google"], aal: "aal1", hasVerifiedTotp: false })).toBe("deny");
  });
  it("aal desconocido no equivale a aal2", () => {
    expect(decideAdminAccess({ ...base, amrMethods: ["password"], aal: "aal3", hasVerifiedTotp: false })).toBe("deny");
  });
});

describe("extractAmrMethods", () => {
  it("acepta strings, objetos { method } y descarta basura", () => {
    expect(extractAmrMethods(["oauth", { method: "totp", timestamp: 1 }, 5, null, {}, { method: 3 }])).toEqual(["oauth", "totp"]);
  });
  it("no es lista: vacío", () => {
    expect(extractAmrMethods(undefined)).toEqual([]);
    expect(extractAmrMethods("oauth")).toEqual([]);
    expect(extractAmrMethods({ method: "oauth" })).toEqual([]);
  });
});
