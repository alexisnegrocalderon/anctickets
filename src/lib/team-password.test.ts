import { describe, expect, it } from "vitest";
import { PASSWORD_MAX, PASSWORD_MIN, passwordStrength, validateNewPassword } from "./team-password";

const EMAIL = "admin@test.cl";
const GOOD = "caballo lento 7 nubes";

describe("validateNewPassword", () => {
  it("acepta una frase larga", () => expect(validateNewPassword(GOOD, GOOD, EMAIL)).toBeNull());
  it("mínimo 12: 11 falla, 12 pasa", () => {
    const eleven = "abcdefghijk";
    const twelve = "abcdefghijkl";
    expect(eleven.length).toBe(PASSWORD_MIN - 1);
    expect(validateNewPassword(eleven, eleven, EMAIL)).toMatch(/al menos 12/);
    expect(validateNewPassword(twelve, twelve, EMAIL)).toBeNull();
  });
  it("máximo 72: 72 pasa, 73 falla", () => {
    const p72 = "abcdefghij".repeat(7) + "kl";
    expect(p72.length).toBe(PASSWORD_MAX);
    expect(validateNewPassword(p72, p72, EMAIL)).toBeNull();
    const p73 = p72 + "m";
    expect(validateNewPassword(p73, p73, EMAIL)).toMatch(/72/);
  });
  it("cuenta bytes: 40 emojis exceden 72 bytes", () => {
    const e = "😀".repeat(40);
    expect(validateNewPassword(e, e, EMAIL)).toMatch(/72/);
  });
  it("igual al correo o conteniéndolo (sin distinguir mayúsculas)", () => {
    expect(validateNewPassword("admin@test.cl", "admin@test.cl", EMAIL)).toMatch(/correo/);
    expect(validateNewPassword("ADMIN@test.CL", "ADMIN@test.CL", EMAIL)).toMatch(/correo/);
    expect(validateNewPassword("xx-admin@test.cl-99", "xx-admin@test.cl-99", EMAIL)).toMatch(/correo/);
  });
  it("no coincide con la repetición", () => {
    expect(validateNewPassword(GOOD, GOOD + "x", EMAIL)).toMatch(/no coinciden/);
  });
  it("rechaza claves de uno o dos caracteres repetidos", () => {
    expect(validateNewPassword("aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa", EMAIL)).toMatch(/repetitiva/);
    expect(validateNewPassword("abababababab", "abababababab", EMAIL)).toMatch(/repetitiva/);
  });
  it("sin correo conocido igual valida el resto", () => {
    expect(validateNewPassword(GOOD, GOOD, null)).toBeNull();
  });
  it("no exige mayúsculas ni símbolos", () => {
    expect(validateNewPassword("solo minusculas largas", "solo minusculas largas", EMAIL)).toBeNull();
  });
});

describe("passwordStrength", () => {
  it("vacía, corta, repetitiva y frases largas", () => {
    expect(passwordStrength("").label).toBe("");
    expect(passwordStrength("corta").label).toBe("Muy corta");
    expect(passwordStrength("aaaaaaaaaaaaaaaaaaaa").label).toBe("Muy repetitiva");
    expect(passwordStrength("abcdefghijkl").score).toBe(1);
    expect(passwordStrength("caballo lento 7 nubes").score).toBeGreaterThanOrEqual(2);
    expect(passwordStrength("caballo lento y verde cruza 7 nubes grises").score).toBe(3);
  });
});
