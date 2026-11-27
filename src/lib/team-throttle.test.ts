import { describe, expect, it } from "vitest";
import {
  FAILURE_DELAY_MS,
  MAX_FAILS_PER_EMAIL,
  MAX_FAILS_PER_IP,
  WINDOW_MS,
  clientIpFromHeaders,
  hashIdentifier,
  isLockedOut,
  type Attempt,
} from "./team-throttle";

const NOW = Date.parse("2026-06-01T12:00:00Z");
const keys = { emailHash: "E", ipHash: "I" };
const fail = (over: Partial<Attempt> = {}, agoMs = 1000): Attempt => ({
  email_hash: "E",
  ip_hash: "I",
  ok: false,
  created_at: new Date(NOW - agoMs).toISOString(),
  ...over,
});
const many = (n: number, over: Partial<Attempt> = {}, agoMs = 1000) => Array.from({ length: n }, () => fail(over, agoMs));

describe("hashIdentifier", () => {
  it("no devuelve el correo ni la IP en claro", () => {
    const e = hashIdentifier("email", "admin@test.cl", "sal-x");
    const i = hashIdentifier("ip", "203.0.113.9", "sal-x");
    expect(e).toMatch(/^[0-9a-f]{64}$/);
    expect(i).toMatch(/^[0-9a-f]{64}$/);
    expect(e).not.toContain("admin");
    expect(i).not.toContain("203");
  });
  it("es estable, normaliza el correo y depende de la sal y del tipo", () => {
    expect(hashIdentifier("email", " Admin@Test.CL ", "s")).toBe(hashIdentifier("email", "admin@test.cl", "s"));
    expect(hashIdentifier("email", "a@test.cl", "s1")).not.toBe(hashIdentifier("email", "a@test.cl", "s2"));
    expect(hashIdentifier("email", "x", "s")).not.toBe(hashIdentifier("ip", "x", "s"));
  });
});

describe("isLockedOut", () => {
  it("sin intentos: no bloquea", () => expect(isLockedOut([], keys, NOW)).toBe(false));
  it("7 fallos del correo: no; 8: sí", () => {
    expect(isLockedOut(many(MAX_FAILS_PER_EMAIL - 1, { ip_hash: "otra" }), keys, NOW)).toBe(false);
    expect(isLockedOut(many(MAX_FAILS_PER_EMAIL, { ip_hash: "otra" }), keys, NOW)).toBe(true);
  });
  it("19 fallos de la IP: no; 20: sí (correos distintos)", () => {
    const withMail = (n: number) => Array.from({ length: n }, (_, k) => fail({ email_hash: `m${k}` }));
    expect(isLockedOut(withMail(MAX_FAILS_PER_IP - 1), keys, NOW)).toBe(false);
    expect(isLockedOut(withMail(MAX_FAILS_PER_IP), keys, NOW)).toBe(true);
  });
  it("los intentos exitosos no cuentan", () => {
    expect(isLockedOut(many(30, { ok: true }), keys, NOW)).toBe(false);
  });
  it("fallos fuera de la ventana de 15 minutos no cuentan; justo dentro sí", () => {
    expect(isLockedOut(many(10, { ip_hash: "otra" }, WINDOW_MS + 1000), keys, NOW)).toBe(false);
    expect(isLockedOut(many(8, { ip_hash: "otra" }, WINDOW_MS - 1000), keys, NOW)).toBe(true);
  });
  it("el reloj inyectable desbloquea al avanzar el tiempo", () => {
    const attempts = many(8, { ip_hash: "otra" });
    expect(isLockedOut(attempts, keys, NOW)).toBe(true);
    expect(isLockedOut(attempts, keys, NOW + WINDOW_MS + 5000)).toBe(false);
    expect(isLockedOut(attempts, keys, new Date(NOW + WINDOW_MS + 5000))).toBe(false);
  });
  it("fallos de otro correo y otra IP no cuentan", () => {
    expect(isLockedOut(many(50, { email_hash: "x", ip_hash: "y" }), keys, NOW)).toBe(false);
  });
  it("fechas inválidas se ignoran", () => {
    expect(isLockedOut(many(50, { created_at: "no-es-fecha" }), keys, NOW)).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;
  it("toma la primera IP de x-forwarded-for", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("cae a x-real-ip y luego a unknown", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIpFromHeaders(h({}))).toBe("unknown");
  });
});

it("la espera por fallo es de unos 600 ms", () => expect(FAILURE_DELAY_MS).toBe(600));
