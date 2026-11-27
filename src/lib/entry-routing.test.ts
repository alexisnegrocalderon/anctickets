import { describe, expect, it } from "vitest";
import { CREATE_EVENT_PATH, decideEntry, parseSide } from "./entry-routing";
import { safeNextPath } from "./safe-redirect";
import { isReservedSlug } from "./reserved-slugs";

const anon = { loggedIn: false, isProducer: false, side: null } as const;

describe("decideEntry (a dónde cae cada visita)", () => {
  it("sin contexto muestra las puertas", () => {
    expect(decideEntry({ ...anon })).toBeNull();
  });

  it("?para=productores va a la portada de productores, sin puertas", () => {
    expect(decideEntry({ ...anon, para: "productores" })).toBe("/productores");
    expect(decideEntry({ ...anon, para: "Productoras" })).toBe("/productores");
  });

  it("?para=productores gana aunque haya sesión o elección previa", () => {
    expect(decideEntry({ loggedIn: true, isProducer: false, side: "eventos", para: "productores" })).toBe("/productores");
  });

  it("un valor desconocido de ?para no cambia nada", () => {
    expect(decideEntry({ ...anon, para: "https://malo.com" })).toBeNull();
  });

  it("enlace con código de embajador va a la cartelera y conserva el código", () => {
    expect(decideEntry({ ...anon, ref: "ABC123" })).toBe("/eventos?ref=ABC123");
  });

  it("un ?ref con formato inválido se ignora", () => {
    expect(decideEntry({ ...anon, ref: "<script>" })).toBeNull();
    expect(decideEntry({ ...anon, ref: "ab" })).toBeNull();
  });

  it("productora con sesión va a su panel", () => {
    expect(decideEntry({ loggedIn: true, isProducer: true, side: null })).toBe("/dashboard/events");
  });

  it("público con sesión va a la cartelera", () => {
    expect(decideEntry({ loggedIn: true, isProducer: false, side: null })).toBe("/eventos");
  });

  it("la sesión gana sobre la elección guardada", () => {
    expect(decideEntry({ loggedIn: true, isProducer: true, side: "eventos" })).toBe("/dashboard/events");
  });

  it("segunda visita: entra directo al lado que eligió", () => {
    expect(decideEntry({ ...anon, side: "eventos" })).toBe("/eventos");
    expect(decideEntry({ ...anon, side: "productor" })).toBe("/productores");
  });
});

describe("parseSide", () => {
  it("solo acepta los dos lados conocidos", () => {
    expect(parseSide("eventos")).toBe("eventos");
    expect(parseSide("productor")).toBe("productor");
    expect(parseSide("admin")).toBeNull();
    expect(parseSide(undefined)).toBeNull();
  });
});

describe("rutas nuevas", () => {
  it("el destino de 'Crear evento' pasa la regla de redirección segura", () => {
    expect(safeNextPath(CREATE_EVENT_PATH)).toBe(CREATE_EVENT_PATH);
  });

  it("productores, cartelera y acceso-equipo quedan reservadas como slug de evento", () => {
    for (const s of ["productores", "cartelera", "acceso-equipo", "eventos"]) {
      expect(isReservedSlug(s)).toBe(true);
    }
  });
});

describe("onboardingNext", () => {
  it("acepta rutas del panel y rechaza el resto", async () => {
    const { onboardingNext } = await import("./safe-redirect");
    expect(onboardingNext("/dashboard/events/new")).toBe("/dashboard/events/new");
    expect(onboardingNext(undefined)).toBe("/dashboard/events");
    expect(onboardingNext("/admin")).toBe("/dashboard/events");
    expect(onboardingNext("//malo.com/dashboard")).toBe("/dashboard/events");
    expect(onboardingNext("/dashboardx")).toBe("/dashboard/events");
  });
});

describe("contadores de las puertas", () => {
  it("el navegador solo puede sumar claves conocidas, y no el alta", async () => {
    const { isClientMetric } = await import("./entry-metrics");
    expect(isClientMetric("puerta_eventos")).toBe(true);
    expect(isClientMetric("alta_productora")).toBe(false);
    expect(isClientMetric("drop table")).toBe(false);
    expect(isClientMetric(42)).toBe(false);
  });
});
