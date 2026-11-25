import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";
import { safeNextPath } from "./safe-redirect";
import { isReservedSlug, safeSlug } from "./reserved-slugs";
import { escapeHtml } from "./html";

describe("csvCell", () => {
  it("neutraliza fórmulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+56 9 1234")).toBe("'+56 9 1234");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@x")).toBe("'@x");
  });
  it("escapa comillas y comas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
  });
});

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/mis-entradas?order=1")).toBe("/mis-entradas?order=1");
  });
  it("rechaza redirecciones abiertas", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "javascript:alert(1)"]) {
      expect(safeNextPath(bad)).toBe("/dashboard/events");
    }
  });
});

describe("reserved slugs", () => {
  it("detecta rutas reservadas", () => {
    expect(isReservedSlug("login")).toBe(true);
    expect(isReservedSlug("Dashboard")).toBe(true);
    expect(isReservedSlug("mi-fiesta")).toBe(false);
  });
  it("safeSlug evita el choque", () => {
    expect(safeSlug("Login")).toBe("login-evento");
    expect(safeSlug("Fiesta Año Nuevo")).toBe("fiesta-ano-nuevo");
  });
});

describe("escapeHtml", () => {
  it("escapa etiquetas", () => {
    expect(escapeHtml('<img src=x onerror="a">')).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;");
  });
});
