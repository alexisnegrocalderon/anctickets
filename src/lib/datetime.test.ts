import { describe, expect, it } from "vitest";
import { chileLocalToIso, isoToChileInput } from "./datetime";

describe("hora de Chile", () => {
  it("verano (UTC-3): 21:30 local es 00:30 UTC del día siguiente", () => {
    expect(chileLocalToIso("2026-01-15T21:30")).toBe("2026-01-16T00:30:00.000Z");
  });
  it("invierno (UTC-4): 21:30 local es 01:30 UTC del día siguiente", () => {
    expect(chileLocalToIso("2026-07-15T21:30")).toBe("2026-07-16T01:30:00.000Z");
  });
  it("ida y vuelta", () => {
    for (const v of ["2026-01-15T21:30", "2026-07-15T09:05", "2026-12-31T23:59"]) {
      expect(isoToChileInput(chileLocalToIso(v))).toBe(v);
    }
  });
  it("entradas inválidas", () => {
    expect(chileLocalToIso("mañana")).toBeNull();
    expect(isoToChileInput(null)).toBe("");
  });
});
