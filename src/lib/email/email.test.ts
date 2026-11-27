import { describe, expect, it } from "vitest";
import {
  EMAIL_LIMITS,
  applyNamePlaceholder,
  buildFromHeader,
  buildInstagramUrl,
  buildMapsUrl,
  buildPalette,
  buildWhatsappUrl,
  fromHeaderForSender,
  hasLink,
  maskEmail,
  normalizeInstagram,
  normalizeWhatsapp,
  pickTextColor,
  renderEventNoticeEmail,
  renderProducerSaleEmail,
  renderProducerSummaryEmail,
  renderTicketEmail,
  resolveAccent,
  safeImageUrl,
  safeSenderName,
  safeSubject,
  sanitizeNoticeMessage,
  sanitizeText,
  senderAddress,
  textToHtml,
  validateContactEmail,
  type TicketEmailData,
} from "./index";
import { contrastRatio } from "@/lib/color";

const SITE = "https://tickets.example.cl";
const SB = "https://abc.supabase.co";
const env = { supabaseUrl: SB, siteUrl: SITE };
const QR = "11111111-2222-4333-8444-555555555555";

function baseData(over: Partial<TicketEmailData["event"]> = {}, extra: Partial<TicketEmailData> = {}): TicketEmailData {
  return {
    siteUrl: SITE,
    kind: "sale",
    producerName: "Productora Demo",
    event: {
      title: "Noche Neón",
      venue: "Galpón Matucana 100, Santiago",
      eventDate: "2026-12-12T22:00:00.000Z",
      imageUrl: null,
      theme: "magenta",
      accentColor: null,
      organizerLogoUrl: null,
      ...over,
    },
    tickets: [{ typeName: "General", qrCode: QR, holderName: "Camila Rojas" }],
    ...extra,
  };
}

const ATTACKS = [
  `<script>alert(1)</script>`,
  `"><img src=x onerror=alert(1)>`,
  `<svg onload=alert(1)>`,
  `javascript:alert(1)`,
  `<a href="javascript:alert(1)">x</a>`,
  `data:text/html;base64,PHNjcmlwdD4=`,
  `</td></tr></table><script>x</script>`,
];

describe("sanitizeText", () => {
  it("recorta, quita control y marcas de dirección, y limita el largo", () => {
    expect(sanitizeText("  hola\u0000 mundo‮  ", 50)).toBe("hola mundo");
    expect(sanitizeText("a‏b‎c⁦d﻿e", 50)).toBe("abcde");
    expect(sanitizeText("x".repeat(500), 280)).toHaveLength(280);
  });
  it("conserva saltos de línea simples pero colapsa los excesivos", () => {
    expect(sanitizeText("uno\r\ndos\n\n\n\n\ntres", 100)).toBe("uno\ndos\n\ntres");
    expect(sanitizeText("uno\ndos", 100, { multiline: false })).toBe("uno dos");
  });
  it("no corta un emoji a la mitad", () => {
    const out = sanitizeText("😀".repeat(10), 5);
    expect(Array.from(out)).toHaveLength(5);
  });
  it("devuelve vacío para valores que no son texto", () => {
    expect(sanitizeText(null, 10)).toBe("");
    expect(sanitizeText({ a: 1 }, 10)).toBe("");
  });
  it("textToHtml escapa todo y solo agrega <br>", () => {
    const html = textToHtml(`<b>hola</b>\n"x" & 'y'`);
    expect(html).toBe("&lt;b&gt;hola&lt;/b&gt;<br>&quot;x&quot; &amp; &#39;y&#39;");
    expect(html).not.toMatch(/<(?!br>)/);
  });
  it("{nombre} se reemplaza y tiene respaldo sin nombre", () => {
    expect(applyNamePlaceholder("Hola {nombre}, bienvenido", "Camila")).toBe("Hola Camila, bienvenido");
    expect(applyNamePlaceholder("Hola {nombre}, bienvenido", null)).toBe("Hola, bienvenido");
    expect(applyNamePlaceholder("{nombre}, pasa nomás", null)).toBe("pasa nomás");
  });
});

describe("instagram", () => {
  it.each([
    ["usuario", "usuario"],
    ["@usuario", "usuario"],
    ["https://instagram.com/usuario", "usuario"],
    ["https://www.instagram.com/usuario/?hl=es", "usuario"],
    ["instagram.com/mi.user_1", "mi.user_1"],
  ])("normaliza %s", (input, out) => {
    expect(normalizeInstagram(input)).toBe(out);
  });
  it.each([
    "",
    "a".repeat(31),
    "user name",
    "user<script>",
    "javascript:alert(1)",
    "https://evil.com/usuario",
    "https://instagram.com.evil.com/usuario",
    "https://instagram.com/p/ABC123",
    "usuario\nBcc: x@y.cl",
    "http://instagram.com/usuario/otro",
    "...",
  ])("rechaza %j", (input) => {
    expect(normalizeInstagram(input)).toBeNull();
  });
  it("arma solo https://instagram.com/<usuario>", () => {
    expect(buildInstagramUrl("@anc.cl")).toBe("https://instagram.com/anc.cl");
    expect(buildInstagramUrl("evil.com/x")).toBeNull();
  });
});

describe("whatsapp", () => {
  it("acepta dígitos con + opcional y separadores comunes", () => {
    expect(normalizeWhatsapp("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizeWhatsapp("(56) 912-345-678")).toBe("56912345678");
    expect(buildWhatsappUrl("+56912345678")).toBe("https://wa.me/56912345678");
  });
  it.each(["", "1234567", "1".repeat(16), "abc", "+56 9 12<script>", "https://wa.me/56912345678", "56912345678\nx", "++56912345678", "javascript:1"])(
    "rechaza %j",
    (input) => {
      expect(normalizeWhatsapp(input)).toBeNull();
    }
  );
});

describe("correo de contacto", () => {
  it("acepta correos normales y los baja a minúsculas", () => {
    expect(validateContactEmail("  Hola@Productora.CL ")).toBe("hola@productora.cl");
    expect(validateContactEmail("a.b+c@sub.dominio.com")).toBe("a.b+c@sub.dominio.com");
  });
  it.each([
    "",
    "sin-arroba",
    "a@b",
    "a@@b.cl",
    "a b@c.cl",
    "a@b.cl\nBcc: victima@x.cl",
    "a@b.cl\r\nSubject: x",
    "<a@b.cl>",
    '"a"@b.cl',
    "a@b.cl, c@d.cl",
    "a@b.cl;c@d.cl",
    "a..b@c.cl",
    ".a@b.cl",
    `${"a".repeat(250)}@b.cl`,
    "a@b.cl‮",
    "a@-b.cl",
  ])("rechaza %j", (input) => {
    expect(validateContactEmail(input)).toBeNull();
  });
});

describe("maps", () => {
  it("arma la URL de Google Maps con el lugar codificado", () => {
    expect(buildMapsUrl("Galpón Matucana 100, Santiago")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Galp%C3%B3n%20Matucana%20100%2C%20Santiago"
    );
  });
  it("neutraliza intentos de inyección dentro del lugar", () => {
    const url = buildMapsUrl(`x&q=1#"><script>`)!;
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(url).not.toMatch(/[<>"#]/);
    expect(url.split("&")).toHaveLength(2);
  });
  it("vacío = sin botón", () => {
    expect(buildMapsUrl("")).toBeNull();
    expect(buildMapsUrl(null)).toBeNull();
  });
});

describe("imágenes", () => {
  it("acepta almacenamiento público de Supabase del proyecto y /api propio", () => {
    expect(safeImageUrl(`${SB}/storage/v1/object/public/event-images/a/b.png`, env)).toBe(`${SB}/storage/v1/object/public/event-images/a/b.png`);
    expect(safeImageUrl(`${SITE}/api/qr/${QR}`, env)).toBe(`${SITE}/api/qr/${QR}`);
  });
  it.each([
    "http://abc.supabase.co/storage/v1/object/public/x.png",
    "https://evil.com/x.png",
    "https://abc.supabase.co.evil.com/storage/v1/object/public/x.png",
    "https://otro.supabase.co/storage/v1/object/public/x.png",
    "https://abc.supabase.co/rest/v1/events",
    "https://abc.supabase.co/storage/v1/object/sign/x.png",
    "https://user:pass@abc.supabase.co/storage/v1/object/public/x.png",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "//evil.com/x.png",
    "/api/qr/x",
    `${SB}/storage/v1/object/public/x.png" onerror="alert(1)`,
    `${SB}/storage/v1/object/public/x.png\nBcc: a@b.cl`,
    "https://tickets.example.cl/otra/ruta.png",
    "",
    null,
  ])("rechaza %j", (input) => {
    expect(safeImageUrl(input as string | null, env)).toBeNull();
  });
});

describe("cabeceras", () => {
  it("el nombre del remitente no lleva comillas, <>, saltos ni dos puntos y mide <= 60", () => {
    const evil = `Fiesta "VIP" <ceo@banco.cl>\r\nBcc: x@y.cl: urgente`;
    const name = safeSenderName(evil);
    expect(name).not.toMatch(/["<>\r\n:@]/);
    expect(name.endsWith(" vía ANC Tickets")).toBe(true);
    expect(Array.from(name).length).toBeLessThanOrEqual(60);
    expect(safeSenderName("A".repeat(200)).length).toBeLessThanOrEqual(60);
    expect(safeSenderName("")).toBe("ANC Tickets");
    expect(safeSenderName(null)).toBe("ANC Tickets");
  });
  it("la dirección real sale de RESEND_FROM_EMAIL o del valor por defecto", () => {
    expect(senderAddress("ANC <tickets@ancdigital.cl>")).toBe("tickets@ancdigital.cl");
    expect(senderAddress("test@example.com")).toBe("test@example.com");
    expect(senderAddress("")).toBe("tickets@ancdigital.cl");
    expect(senderAddress("basura <<>>")).toBe("tickets@ancdigital.cl");
    expect(buildFromHeader(`Evil" <hack@x.cl>`, "ANC <tickets@ancdigital.cl>")).toBe("Evil hackx.cl vía ANC Tickets <tickets@ancdigital.cl>");
    expect(fromHeaderForSender(`X"<a@b.cl>\nBcc: z`, "t@example.com")).not.toMatch(/[\r\n"]/);
  });
  it("el asunto es de una línea y solo usa el título", () => {
    const s = safeSubject("Tus entradas para ", `Fiesta\r\nBcc: a@b.cl‮`);
    expect(s).not.toMatch(/[\r\n‮]/);
    expect(safeSubject("X ", "t".repeat(500)).length).toBeLessThanOrEqual(122);
  });
  it("renderTicketEmail: reply_to solo si el contacto es válido y nunca el remitente", () => {
    const ok = renderTicketEmail(baseData({ contactEmail: "Hola@Prod.cl" }));
    expect(ok.replyTo).toBe("hola@prod.cl");
    const bad = renderTicketEmail(baseData({ contactEmail: "a@b.cl\nBcc: x@y.cl" }));
    expect(bad.replyTo).toBeNull();
    expect(renderTicketEmail(baseData()).replyTo).toBeNull();
  });
  it("enmascara correos para los logs", () => {
    expect(maskEmail("camila@gmail.com")).toBe("ca***@gm***.com");
    expect(maskEmail(null)).toBe("(sin correo)");
  });
});

describe("color de acento", () => {
  it("elige texto blanco u oscuro por contraste (>= 4.5 en acentos típicos)", () => {
    expect(pickTextColor("#101820")).toBe("#ffffff");
    expect(pickTextColor("#ffe14d")).toBe("#111111");
    expect(pickTextColor("#ff206e")).toBe("#111111");
    for (const hex of ["#ff6600", "#808080", "#00aa55", "#3366ff"]) {
      const text = pickTextColor(hex);
      expect(contrastRatio(hex, text)).toBeGreaterThanOrEqual(4.4);
    }
  });
  it("resuelve acentos nulos o inválidos al color del mood", () => {
    expect(resolveAccent("custom", null)).toBe("#ff206e");
    expect(resolveAccent("custom", "rojo")).toBe("#ff206e");
    expect(resolveAccent("custom", "#12345")).toBe("#ff206e");
    expect(resolveAccent("custom", "#FF6600")).toBe("#ff6600");
    expect(resolveAccent("turquoise", "#ff6600")).toBe("#41ead4");
    expect(resolveAccent(null, undefined)).toBe("#ff206e");
  });
  it("amarillo muy claro: texto legible sobre blanco y botón con borde", () => {
    const p = buildPalette("#ffe14d");
    expect(contrastRatio(p.inkLight, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.btnBg, p.btnText)).toBeGreaterThanOrEqual(4.5);
    expect(p.btnBorder).not.toBeNull();
  });
  it("casi negro: se aclara en modo oscuro y el texto queda legible", () => {
    const p = buildPalette("#101820");
    expect(contrastRatio(p.inkDark, "#19191b")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.btnBgDark, "#19191b")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.btnBgDark, p.btnTextDark)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.inkLight, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("acento nulo o inválido usa el de ANC", () => {
    expect(buildPalette(null).accent).toBe("#ff206e");
    expect(buildPalette("javascript:1").accent).toBe("#ff206e");
    expect(buildPalette('#fff;"><script>').accent).toBe("#ff206e");
  });
  it("un acento con intento de inyección nunca llega al HTML", () => {
    const r = renderTicketEmail(baseData({ theme: "custom", accentColor: '#ff0000;background:url(javascript:1)"' }));
    expect(r.html).not.toContain("javascript:");
    expect(r.html).toContain("#ff206e");
  });
});

describe("renderTicketEmail: ataques", () => {
  it.each(ATTACKS)("escapa %j en todos los campos de texto", (attack) => {
    const r = renderTicketEmail(
      baseData(
        {
          title: attack,
          venue: attack,
          welcome: attack,
          access: attack,
          rules: attack,
          directions: attack,
          contactInstagram: attack,
          contactWhatsapp: attack,
          contactEmail: attack,
          imageUrl: attack,
          organizerLogoUrl: attack,
        },
        {
          producerName: attack,
          tickets: [{ typeName: attack, qrCode: attack, holderName: attack, note: attack }],
          greetingName: attack,
        }
      )
    );
    // Ninguna etiqueta ni atributo peligroso sobrevive.
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).not.toMatch(/<img[^>]+onerror/i);
    expect(r.html).not.toMatch(/<svg/i);
    expect(r.html).not.toMatch(/href="javascript:/i);
    expect(r.html).not.toMatch(/src="(?:javascript|data):/i);
    // La única imagen permitida es el sello fijo de Tico (nuestra propia URL); ninguna imagen
    // puede venir de los campos que controla quien escribe.
    const withoutSeal = r.html.replace(/<img src="[^"]*\/tico\/pulgar\.png"[^>]*>/g, "");
    expect(withoutSeal.match(/<img\b/g)?.length ?? 0).toBe(0);
    expect(r.html.match(/<img\b/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.replyTo).toBeNull();
  });

  it("todo href/src del HTML apunta a https, mailto o es la URL propia", () => {
    const r = renderTicketEmail(
      baseData({
        contactInstagram: "@anc.cl",
        contactWhatsapp: "+56912345678",
        contactEmail: "hola@prod.cl",
        directions: "Por la calle principal",
        imageUrl: `${SB}/storage/v1/object/public/event-images/x.png`,
        organizerLogoUrl: `${SB}/storage/v1/object/public/event-images/logo.png`,
      })
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = SB;
    const urls = [...r.html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    expect(urls.length).toBeGreaterThan(5);
    for (const u of urls) expect(u).toMatch(/^(https:\/\/|mailto:)/);
  });

  it("imagen externa o de otro host no se muestra", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SB;
    const r = renderTicketEmail(baseData({ imageUrl: "https://evil.com/x.png", organizerLogoUrl: "http://abc.supabase.co/storage/v1/object/public/l.png" }));
    expect(r.html).not.toContain("evil.com");
    expect(r.html).not.toContain("abc.supabase.co");
  });

  it("saltos de línea en título o nombre no se cuelan en asunto ni remitente", () => {
    const r = renderTicketEmail(baseData({ title: "Fiesta\r\nBcc: a@b.cl" }, { producerName: "Prod\nFrom: x@y.cl" }));
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.senderName).not.toMatch(/[\r\n:@]/);
  });

  it("los campos largos se recortan al límite", () => {
    const long = "palabra ".repeat(300);
    const r = renderTicketEmail(baseData({ welcome: long, access: long, rules: long, directions: long }, { tickets: [{ typeName: "VIP", qrCode: QR, holderName: null, note: long }] }));
    const count = (needle: string) => r.html.split(needle).length - 1;
    expect(count("palabra")).toBeLessThanOrEqual(
      Math.ceil(EMAIL_LIMITS.welcome / 8) + Math.ceil(EMAIL_LIMITS.access / 8) + Math.ceil(EMAIL_LIMITS.rules / 8) + Math.ceil(EMAIL_LIMITS.directions / 8) + Math.ceil(EMAIL_LIMITS.ticketNote / 8) + 2
    );
  });

  it("caracteres Unicode de control no llegan al HTML ni al texto", () => {
    const r = renderTicketEmail(baseData({ welcome: "Hola‮ odnum​\u0007⁦" }));
    expect(r.html).not.toMatch(/[‪-‮⁦-⁩​-‏\u0007]/);
    expect(r.text).not.toMatch(/[‪-‮⁦-⁩​-‏\u0007]/);
  });
});

describe("renderTicketEmail: contenido", () => {
  it("minimo: sin bloques opcionales no se renderizan secciones vacías", () => {
    const r = renderTicketEmail(baseData());
    expect(r.html).not.toContain("Información de acceso");
    expect(r.html).not.toContain("Reglas del evento");
    expect(r.html).not.toContain("Cómo llegar");
    expect(r.html).not.toContain(">Contacto<");
    expect(r.html).toContain("Ver mis entradas");
    expect(r.html).toContain(`${SITE}/mis-entradas`);
    expect(r.html).toContain(`${SITE}/api/qr/${QR}`);
    expect(r.html).toContain("Productora Demo");
    expect(r.html).toContain("Entradas por ANC Tickets");
    expect(r.subject).toBe("Tus entradas para Noche Neón");
  });
  it("bloques completos, saludo con {nombre} y nota por tipo de entrada", () => {
    const r = renderTicketEmail(
      baseData(
        {
          welcome: "¡Hola {nombre}! Te esperamos.",
          access: "Puertas 22:00\nHasta la 1:00",
          rules: "Mayores de 18",
          directions: "Metro Quinta Normal",
          contactInstagram: "@anc",
          contactWhatsapp: "+56912345678",
          contactEmail: "hola@prod.cl",
        },
        {
          tickets: [
            { typeName: "General", qrCode: QR, holderName: "Camila Rojas" },
            { typeName: "VIP", qrCode: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", holderName: "Camila Rojas", note: "Retira tu pulsera en la barra" },
          ],
        }
      )
    );
    expect(r.html).toContain("¡Hola Camila! Te esperamos.");
    expect(r.html).toContain("Puertas 22:00<br>Hasta la 1:00");
    expect(r.html).toContain("Información de acceso");
    expect(r.html).toContain("Reglas del evento");
    expect(r.html).toContain("Abrir en Maps");
    expect(r.html).toContain("https://instagram.com/anc");
    expect(r.html).toContain("https://wa.me/56912345678");
    expect(r.html).toContain("mailto:hola@prod.cl");
    expect(r.html).toContain("Retira tu pulsera en la barra");
    expect(r.html.match(/Para esta entrada/g)).toHaveLength(1);
    expect(r.text).toContain("Retira tu pulsera en la barra");
    expect(r.text).toContain("INFORMACIÓN DE ACCESO");
    expect(r.text).not.toMatch(/<[a-z]/i);
  });
  it("cortesía usa el encabezado de invitación", () => {
    const r = renderTicketEmail(baseData({}, { kind: "courtesy" }));
    expect(r.html).toContain("Tienes una invitación");
    expect(r.html).not.toContain("Compra confirmada");
    expect(renderTicketEmail(baseData()).html).toContain("Compra confirmada");
  });
  it("incluye preheader, meta de color-scheme, VML y texto alternativo", () => {
    const r = renderTicketEmail(baseData());
    expect(r.html).toContain('name="color-scheme" content="light dark"');
    expect(r.html).toContain('name="supported-color-schemes"');
    expect(r.html).toContain("prefers-color-scheme:dark");
    expect(r.html).toContain("<v:roundrect");
    expect(r.html).toMatch(/display:none[^>]*>Tus entradas para Noche Neón: /);
    expect(r.html).toMatch(/alt="Código QR de la entrada 1"/);
    expect(r.text.length).toBeGreaterThan(50);
  });
  it("portada solo si se activa y la URL es válida; logo o nombre", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SB;
    const img = `${SB}/storage/v1/object/public/event-images/x.png`;
    expect(renderTicketEmail(baseData({ imageUrl: img })).html).toContain(img);
    expect(renderTicketEmail(baseData({ imageUrl: img, useEventImage: false })).html).not.toContain(img);
    const logo = `${SB}/storage/v1/object/public/event-images/logo.png`;
    expect(renderTicketEmail(baseData({ organizerLogoUrl: logo })).html).toContain(`src="${logo}"`);
  });
  it("modo prueba: asunto con [Prueba] y aviso", () => {
    const r = renderTicketEmail(baseData({}, { isTest: true }));
    expect(r.subject.startsWith("[Prueba] ")).toBe(true);
    expect(r.html).toContain("Esto es una prueba");
  });
  it("fecha igual a la de la página pública", () => {
    const r = renderTicketEmail(baseData());
    const d = new Date("2026-12-12T22:00:00.000Z");
    const time = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    expect(r.html).toContain(time);
  });
});

describe("avisos y correos de ANC", () => {
  it("aviso de venta: sin correo ni teléfono del comprador, solo nombre de pila", () => {
    const r = renderProducerSaleEmail({
      siteUrl: SITE,
      eventId: "evt-1",
      eventTitle: "Noche Neón",
      kind: "sale",
      lines: [{ name: "VIP", quantity: 2 }],
      amount: 50000,
      sold: 80,
      total: 100,
      buyerName: "Camila Rojas <script>",
    });
    expect(r.html).toContain("Camila");
    expect(r.html).not.toContain("Rojas");
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).toContain("$50.000");
    expect(r.html).toContain("80 de 100");
    expect(r.html).toContain(`${SITE}/dashboard/events/evt-1/edit?tab=ventas`);
    expect(r.subject).toBe("Nueva venta: Noche Neón");
    expect(r.replyTo).toBeNull();
    expect(r.senderName).toBe("ANC Tickets");
  });
  it("resumen diario suma entradas y monto", () => {
    const r = renderProducerSummaryEmail({
      siteUrl: SITE,
      dayLabel: "jueves 26 de noviembre",
      events: [
        { id: "a", title: "Uno", tickets: 3, amount: 30000, sold: 10, total: 50 },
        { id: "b", title: "Dos", tickets: 2, amount: 10000, sold: 5, total: 20 },
      ],
    });
    expect(r.html).toContain("5 entradas vendidas");
    expect(r.html).toContain("$40.000");
  });
  it("aviso de cancelación lo dice; aviso de cambio lista fecha y lugar actuales", () => {
    const ev = { title: "Noche Neón", venue: "Nuevo Galpón 5", eventDate: "2026-12-19T21:00:00.000Z", status: "published", theme: "magenta" as const, accentColor: null };
    const c = renderEventNoticeEmail({ siteUrl: SITE, kind: "cancelled", message: "Por fuerza mayor.", producerName: "Prod", event: ev });
    expect(c.html).toContain("Evento cancelado");
    expect(c.html).not.toContain("Nuevo Galpón 5");
    const ch = renderEventNoticeEmail({ siteUrl: SITE, kind: "changed", message: "Cambiamos el lugar.", producerName: "Prod", event: ev, contactEmail: "hola@prod.cl" });
    expect(ch.html).toContain("Nuevo Galpón 5");
    expect(ch.html).toContain("Cambiamos el lugar.");
    expect(ch.replyTo).toBe("hola@prod.cl");
    const cs = renderEventNoticeEmail({ siteUrl: SITE, kind: "changed", message: "x", producerName: "Prod", event: { ...ev, status: "cancelled" } });
    expect(cs.html).toContain("Evento cancelado");
  });
  it("el mensaje del aviso es solo texto: se escapa y se limita a 500", () => {
    const r = renderEventNoticeEmail({
      siteUrl: SITE,
      kind: "changed",
      message: `<script>alert(1)</script>\n<img src=x onerror=alert(1)>`,
      producerName: `Prod "X" <a@b.cl>`,
      event: { title: "T", venue: null, eventDate: "2026-12-19T21:00:00.000Z", status: "published", theme: "magenta", accentColor: null },
    });
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).not.toMatch(/<img[^>]*onerror/i);
    expect(sanitizeNoticeMessage("a".repeat(900))).toHaveLength(500);
  });
  it("detecta enlaces en el mensaje del aviso", () => {
    for (const t of ["mira https://x.cl", "www.x.cl", "entra a x.com", "mailto:a@b.cl", "javascript:alert(1)", "tickets.cl/evento"]) {
      expect(hasLink(t)).toBe(true);
    }
    for (const t of ["Cambiamos la hora a las 22:30.", "La puerta ahora es la 2, gracias."]) {
      expect(hasLink(t)).toBe(false);
    }
  });
});

describe("Tico en los correos", () => {
  it("el correo de la entrada lleva a Tico en el pie, con URL absoluta propia y texto alternativo", () => {
    const r = renderTicketEmail(baseData());
    const seal = r.html.match(/<img src="([^"]*\/tico\/pulgar\.png)"[^>]*>/);
    expect(seal?.[1]).toBe(`${SITE}/tico/pulgar.png`);
    expect(seal?.[0]).toMatch(/alt="Tico, de ANC Tickets"/);
  });

  it("solo hay una imagen de Tico en el correo", () => {
    const r = renderTicketEmail(baseData());
    expect(r.html.match(/\/tico\//g)?.length).toBe(1);
  });
});
