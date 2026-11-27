import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminEmails, hasVerifiedEmail, isAdminEmail, isAdminUser, parseAdminEmails } from "./admin";

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
