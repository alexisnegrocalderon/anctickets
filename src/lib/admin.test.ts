import { afterEach, describe, expect, it, vi } from "vitest";
import { decideAdminAccess, extractAmrMethods, getAdminEmails, hasVerifiedEmail, isAdminEmail, isAdminUser, isWeakAdminSession, parseAdminEmails } from "./admin";

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
  const amrCases: (string[] | null | undefined)[] = [["oauth"], ["password"], ["password", "totp"], ["totp"], [], undefined, null];
  const aalCases: (string | null | undefined)[] = ["aal1", "aal2", "aal3", null, undefined];

  it("exhaustivo: allow solo si es admin Y (amr incluye oauth O aal === aal2)", () => {
    for (const amrMethods of amrCases) {
      for (const aal of aalCases) {
        for (const isAdmin of [true, false]) {
          const expected = isAdmin && (!!amrMethods?.includes("oauth") || aal === "aal2") ? "allow" : "deny";
          expect(decideAdminAccess({ isAdmin, amrMethods, aal })).toBe(expected);
        }
      }
    }
  });
  it("no admin: deny aunque tenga oauth o aal2", () => {
    expect(decideAdminAccess({ isAdmin: false, amrMethods: ["oauth"], aal: "aal2" })).toBe("deny");
  });
  it("oauth (Google): allow con cualquier aal", () => {
    for (const aal of aalCases) expect(decideAdminAccess({ isAdmin: true, amrMethods: ["oauth"], aal })).toBe("allow");
  });
  it("aal2 sin oauth (clave + código): allow, también con amr vacío o ausente", () => {
    for (const amrMethods of [["password", "totp"], [], undefined, null]) {
      expect(decideAdminAccess({ isAdmin: true, amrMethods, aal: "aal2" })).toBe("allow");
    }
  });
  it("clave sola (aal1) o sin garantías: deny", () => {
    for (const aal of ["aal1", null, undefined]) {
      for (const amrMethods of [["password"], [], undefined, null]) {
        expect(decideAdminAccess({ isAdmin: true, amrMethods, aal })).toBe("deny");
      }
    }
  });
  it("método parecido a oauth o aal desconocido no cuenta", () => {
    expect(decideAdminAccess({ isAdmin: true, amrMethods: ["OAuth", "oauth2", "google"], aal: "aal1" })).toBe("deny");
    expect(decideAdminAccess({ isAdmin: true, amrMethods: ["password"], aal: "aal3" })).toBe("deny");
  });
});

describe("isWeakAdminSession (seguro de sesión solo-clave)", () => {
  it("correo admin con clave sola (aal1): débil", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    expect(isWeakAdminSession({ email: "Admin@Test.cl", amrMethods: ["password"], aal: "aal1" })).toBe(true);
    expect(isWeakAdminSession({ email: "admin@test.cl", amrMethods: [], aal: null })).toBe(true);
  });
  it("admin con Google o con aal2: no es débil", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    expect(isWeakAdminSession({ email: "admin@test.cl", amrMethods: ["oauth"], aal: "aal1" })).toBe(false);
    expect(isWeakAdminSession({ email: "admin@test.cl", amrMethods: ["password", "totp"], aal: "aal2" })).toBe(false);
  });
  it("correo que no es admin (o sin correo, o sin ADMIN_EMAILS): nunca débil", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@test.cl");
    expect(isWeakAdminSession({ email: "otra@test.cl", amrMethods: ["password"], aal: "aal1" })).toBe(false);
    expect(isWeakAdminSession({ email: null, amrMethods: ["password"], aal: "aal1" })).toBe(false);
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isWeakAdminSession({ email: "admin@test.cl", amrMethods: ["password"], aal: "aal1" })).toBe(false);
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
