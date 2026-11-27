/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: any[] = [];
const batches: any[][] = [];
let failSingle = false;
let failBatch = false;

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: any) => {
        if (failSingle) return { data: null, error: { message: "boom" } };
        sent.push(msg);
        return { data: { id: "x" }, error: null };
      },
    };
    batch = {
      send: async (msgs: any[]) => {
        if (failBatch) return { data: null, error: { message: "boom" } };
        batches.push(msgs);
        return { data: msgs.map(() => ({ id: "x" })), error: null };
      },
    };
  },
}));

import { deliverOrderEmail } from "@/lib/orders";
import { makeFakeDb } from "./fake-db";
import {
  notifyProducerOfSale,
  previousChileDayWindow,
  sendDailySummaries,
  sendEventNotice,
  collectNoticeRecipients,
} from "./deliver";
import { sendBatchIndividually } from "./send";
import { parseEmailSettings, parseTicketNote } from "./form";
import { renderEventNoticeEmail } from "./notices";

process.env.NEXT_PUBLIC_SITE_URL = "https://tickets.example.cl";
process.env.RESEND_FROM_EMAIL = "ANC <tickets@ancdigital.cl>";

const rels = {
  tickets: { ticket_types: { fk: "ticket_type_id", table: "ticket_types" } },
  order_items: { ticket_types: { fk: "ticket_type_id", table: "ticket_types" } },
};

function world(extra: { missing?: Record<string, string[]>; notify?: string } = {}) {
  return makeFakeDb(
    {
      profiles: [
        { id: "org1", organizer_name: "Productora Demo", email: "prod@demo.cl", notify_sales: extra.notify ?? "each", suspended_at: null, sales_summary_on: null },
        { id: "buyer1", full_name: "Camila Rojas", email: "c@demo.cl" },
      ],
      events: [
        { id: "e1", organizer_id: "org1", title: "Noche Neón", venue: "Galpón", event_date: "2026-12-12T22:00:00.000Z", image_url: null, theme: "magenta", accent_color: null, organizer_logo_url: null, status: "published", contact_email: "hola@demo.cl", email_welcome: "Hola {nombre}" },
      ],
      ticket_types: [
        { id: "t1", event_id: "e1", name: "General", quantity: 100, sold_count: 80, email_note: null },
        { id: "t2", event_id: "e1", name: "VIP", quantity: 20, sold_count: 5, email_note: "Retira tu pulsera" },
      ],
      orders: [
        { id: "o1", event_id: "e1", buyer_id: "buyer1", status: "approved", kind: "sale", buyer_email: "camila@demo.cl", holder_name: "Camila Rojas", email_sent_at: null, producer_notified_at: null, created_at: "2026-11-26T12:00:00Z", tickets_issued_at: "2026-11-26T15:00:00.000Z" },
      ],
      order_items: [{ id: "i1", order_id: "o1", ticket_type_id: "t2", quantity: 2, unit_base_price: 15000 }],
      tickets: [
        { id: "k1", order_id: "o1", ticket_type_id: "t2", qr_code: "11111111-2222-4333-8444-555555555555", holder_name: "Camila Rojas", status: "valid", created_at: "2026-11-26T12:00:01Z" },
        { id: "k2", order_id: "o1", ticket_type_id: "t2", qr_code: "11111111-2222-4333-8444-555555555556", holder_name: null, status: "valid", created_at: "2026-11-26T12:00:02Z" },
      ],
      event_notices: [],
    },
    { missing: extra.missing, rels: { ...rels, orders: { order_items: { fk: "order_id", table: "order_items", many: true } } } }
  );
}

beforeEach(() => {
  sent.length = 0;
  batches.length = 0;
  failSingle = false;
  failBatch = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deliverOrderEmail", () => {
  it("envía el correo con marca, reply_to y nombre de remitente seguros, y luego avisa a la productora", async () => {
    const db = world();
    expect(await deliverOrderEmail(db.client, "o1")).toBe(true);
    const [buyerMail, producerMail] = sent;
    expect(buyerMail.to).toBe("camila@demo.cl");
    expect(buyerMail.from).toBe("Productora Demo vía ANC Tickets <tickets@ancdigital.cl>");
    expect(buyerMail.replyTo).toBe("hola@demo.cl");
    expect(buyerMail.subject).toBe("Tus entradas para Noche Neón");
    expect(buyerMail.html).toContain("Hola Camila");
    expect(buyerMail.html).toContain("Retira tu pulsera");
    expect(buyerMail.text).toContain("Retira tu pulsera");
    expect(producerMail.to).toBe("prod@demo.cl");
    expect(producerMail.html).toContain("$30.000");
    expect(producerMail.html).toContain("85 de 120");
    expect(producerMail.html).not.toContain("camila@demo.cl");
    expect(producerMail.html).not.toContain("Rojas");
    expect(db.tables.orders[0].email_sent_at).not.toBeNull();
    expect(db.tables.orders[0].producer_notified_at).not.toBeNull();
  });

  it("es idempotente: un segundo intento no reenvía ni al comprador ni a la productora", async () => {
    const db = world();
    await deliverOrderEmail(db.client, "o1");
    expect(await deliverOrderEmail(db.client, "o1")).toBe(false);
    expect(sent).toHaveLength(2);
  });

  it("con force reenvía al comprador pero no duplica el aviso a la productora", async () => {
    const db = world();
    await deliverOrderEmail(db.client, "o1");
    await deliverOrderEmail(db.client, "o1", { force: true });
    expect(sent.filter((m) => m.to === "camila@demo.cl")).toHaveLength(2);
    expect(sent.filter((m) => m.to === "prod@demo.cl")).toHaveLength(1);
  });

  it("si Resend falla libera el reclamo y no avisa a la productora", async () => {
    const db = world();
    failSingle = true;
    expect(await deliverOrderEmail(db.client, "o1")).toBe(false);
    expect(db.tables.orders[0].email_sent_at).toBeNull();
    expect(db.tables.orders[0].producer_notified_at).toBeNull();
  });

  it("tolera que la migración 0011 no esté aplicada: el correo sale con la plantilla base", async () => {
    const db = world({
      missing: { ticket_types: ["email_note"], profiles: ["notify_sales", "sales_summary_on"], orders: ["producer_notified_at"] },
    });
    delete (db.tables.events[0] as any).email_welcome;
    delete (db.tables.events[0] as any).contact_email;
    expect(await deliverOrderEmail(db.client, "o1")).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("camila@demo.cl");
    expect(sent[0].replyTo).toBeUndefined();
    expect(sent[0].html).not.toContain("Retira tu pulsera");
    expect(sent[0].html).toContain("Ver mis entradas");
  });

  it("un fallo del aviso de venta nunca afecta al comprador ni a la orden", async () => {
    const db = world();
    // La lectura de ítems (solo la usa el aviso de venta) explota.
    vi.spyOn(db.client, "from").mockImplementation(((t: string) => {
      if (t === "order_items") throw new Error("explotó");
      return makeFakeDb(db.tables).client.from(t);
    }) as any);
    expect(await deliverOrderEmail(db.client, "o1")).toBe(true);
    expect(db.tables.orders[0].email_sent_at).not.toBeNull();
    // El reclamo del aviso se libera para poder reintentar.
    expect(db.tables.orders[0].producer_notified_at).toBeNull();
  });
});

describe("notifyProducerOfSale", () => {
  it("no avisa de cortesías", async () => {
    const db = world();
    db.tables.orders[0].kind = "courtesy";
    expect(await notifyProducerOfSale(db.client, "o1")).toBe(false);
    expect(sent).toHaveLength(0);
  });
  it.each(["daily", "off"])("no avisa por venta si eligió %s", async (mode) => {
    const db = world({ notify: mode });
    expect(await notifyProducerOfSale(db.client, "o1")).toBe(false);
    expect(sent).toHaveLength(0);
  });
  it("avisa de entradas gratis y reclama una sola vez aunque se llame dos veces", async () => {
    const db = world();
    db.tables.orders[0].kind = "free";
    db.tables.order_items[0].unit_base_price = 0;
    const [a, b] = await Promise.all([notifyProducerOfSale(db.client, "o1"), notifyProducerOfSale(db.client, "o1")]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Nueva entrada gratis: Noche Neón");
  });
});

describe("resumen diario", () => {
  it("la ventana es el día anterior en hora de Chile", () => {
    const w = previousChileDayWindow(new Date("2026-11-27T07:00:00Z"));
    expect(w.day).toBe("2026-11-26");
    expect(w.from).toBe("2026-11-26T03:00:00.000Z");
    expect(w.to).toBe("2026-11-27T03:00:00.000Z");
  });
  it("envía una vez y es idempotente el mismo día", async () => {
    const db = world({ notify: "daily" });
    const now = new Date("2026-11-27T07:00:00Z");
    expect(await sendDailySummaries(db.client, now)).toMatchObject({ sent: 1 });
    expect(await sendDailySummaries(db.client, now)).toMatchObject({ sent: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("prod@demo.cl");
    expect(sent[0].html).toContain("$30.000");
    expect(db.tables.profiles[0].sales_summary_on).toBe("2026-11-26");
  });
  it("no envía a quien no eligió resumen ni cuando no hubo ventas ayer", async () => {
    const each = world({ notify: "each" });
    expect(await sendDailySummaries(each.client, new Date("2026-11-27T07:00:00Z"))).toMatchObject({ sent: 0 });
    const daily = world({ notify: "daily" });
    expect(await sendDailySummaries(daily.client, new Date("2026-11-29T07:00:00Z"))).toMatchObject({ sent: 0 });
    expect(sent).toHaveLength(0);
  });
  it("si el envío falla revierte el reclamo", async () => {
    const db = world({ notify: "daily" });
    failSingle = true;
    expect(await sendDailySummaries(db.client, new Date("2026-11-27T07:00:00Z"))).toMatchObject({ failed: 1 });
    expect(db.tables.profiles[0].sales_summary_on).toBeNull();
  });
});

describe("envío por lotes", () => {
  it("manda correos individuales en bloques de 100, cada uno con un solo destinatario", async () => {
    const r = renderEventNoticeEmail({
      siteUrl: "https://tickets.example.cl",
      kind: "changed",
      message: "Cambio de hora",
      producerName: "Prod",
      contactEmail: "hola@prod.cl",
      event: { title: "T", venue: null, eventDate: "2026-12-19T21:00:00.000Z", status: "published", theme: "magenta", accentColor: null },
    });
    const to = Array.from({ length: 250 }, (_, i) => `u${i}@demo.cl`);
    const res = await sendBatchIndividually(to, r, { pauseMs: 0 });
    expect(res).toEqual({ sent: 250, failed: 0 });
    expect(batches.map((b) => b.length)).toEqual([100, 100, 50]);
    for (const m of batches.flat()) {
      expect(m.to).toHaveLength(1);
      expect(m.cc).toBeUndefined();
      expect(m.bcc).toBeUndefined();
      expect(m.replyTo).toBe("hola@prod.cl");
      expect(m.from).toBe("Prod vía ANC Tickets <tickets@ancdigital.cl>");
    }
    expect(new Set(batches.flat().map((m) => m.to[0])).size).toBe(250);
  });
  it("cuenta como fallidos los bloques rechazados", async () => {
    failBatch = true;
    const r = renderEventNoticeEmail({
      siteUrl: "https://tickets.example.cl",
      kind: "cancelled",
      message: "x",
      producerName: null,
      event: { title: "T", venue: null, eventDate: "2026-12-19T21:00:00.000Z", status: "cancelled", theme: "magenta", accentColor: null },
    });
    expect(await sendBatchIndividually(["a@b.cl", "c@d.cl"], r, { pauseMs: 0 })).toEqual({ sent: 0, failed: 2 });
  });
});

describe("avisos de cambio o cancelación", () => {
  const ev = () => world();
  async function run(db: ReturnType<typeof world>, over: Partial<Parameters<typeof sendEventNotice>[1]> = {}) {
    return sendEventNotice(db.client, { event: db.tables.events[0] as any, userId: "org1", kind: "changed", message: "Cambiamos la hora.", ...over });
  }
  it("envía a destinatarios únicos con correo válido y guarda el resultado", async () => {
    const db = ev();
    db.tables.orders.push(
      { id: "o2", event_id: "e1", status: "approved", kind: "courtesy", buyer_email: "CAMILA@demo.cl", created_at: "2026-11-26T13:00:00Z" },
      { id: "o3", event_id: "e1", status: "approved", kind: "sale", buyer_email: "otra@demo.cl", created_at: "2026-11-26T14:00:00Z" },
      { id: "o4", event_id: "e1", status: "approved", kind: "sale", buyer_email: "malo@@x", created_at: "2026-11-26T14:00:00Z" },
      { id: "o5", event_id: "e1", status: "pending", kind: "sale", buyer_email: "pend@demo.cl", created_at: "2026-11-26T14:00:00Z" },
      { id: "o6", event_id: "e1", status: "refunded", kind: "sale", buyer_email: "reem@demo.cl", created_at: "2026-11-26T14:00:00Z" }
    );
    expect((await collectNoticeRecipients(db.client, "e1")).sort()).toEqual(["camila@demo.cl", "otra@demo.cl"]);
    const res = await run(db);
    expect(res).toEqual({ ok: true, recipients: 2, sent: 2, failed: 0 });
    expect(db.tables.event_notices).toHaveLength(1);
    expect(db.tables.event_notices[0]).toMatchObject({ kind: "changed", recipients: 2, sent: 2, failed: 0, created_by: "org1" });
  });
  it("limita a 1 aviso cada 10 minutos y a 3 por evento", async () => {
    const db = ev();
    expect((await run(db)).ok).toBe(true);
    const again = await run(db);
    expect(again.ok).toBe(false);
    expect(again.ok === false && again.error).toMatch(/Espera/);
    db.tables.event_notices.forEach((n, i) => (n.created_at = new Date(Date.now() - (i + 1) * 3_600_000).toISOString()));
    db.tables.event_notices.push(
      { id: "n2", event_id: "e1", created_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
      { id: "n3", event_id: "e1", created_at: new Date(Date.now() - 6 * 3_600_000).toISOString() }
    );
    const third = await run(db);
    expect(third.ok === false && third.error).toMatch(/máximo/);
  });
  it("una productora suspendida no puede enviar avisos", async () => {
    const db = ev();
    db.tables.profiles[0].suspended_at = "2026-11-01T00:00:00Z";
    const res = await run(db);
    expect(res.ok).toBe(false);
    expect(batches).toHaveLength(0);
  });
  it("rechaza mensajes vacíos, con enlaces o demasiado largos", async () => {
    const db = ev();
    expect((await run(db, { message: "   " })).ok).toBe(false);
    expect((await run(db, { message: "mira https://evil.com/x" })).ok).toBe(false);
    expect((await run(db, { message: "entra a evil.com ya" })).ok).toBe(false);
    expect((await run(db, { message: "a".repeat(501) })).ok).toBe(false);
    expect((await run(db, { kind: "otro" as any })).ok).toBe(false);
    expect(batches).toHaveLength(0);
    expect(db.tables.event_notices).toHaveLength(0);
  });
  it("sin compradores no envía nada", async () => {
    const db = ev();
    db.tables.orders.length = 0;
    expect((await run(db)).ok).toBe(false);
  });
});

describe("formulario del correo", () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("normaliza y sanea los valores válidos", () => {
    const { values, errors } = parseEmailSettings(
      fd({
        email_welcome: "  Hola {nombre}‮  ",
        contact_instagram: "https://instagram.com/mi.prod/",
        contact_whatsapp: "+56 9 1234 5678",
        contact_email: "HOLA@Prod.cl",
        email_use_event_image: "on",
      })
    );
    expect(errors).toEqual({});
    expect(values).toMatchObject({
      email_welcome: "Hola {nombre}",
      contact_instagram: "mi.prod",
      contact_whatsapp: "+56912345678",
      contact_email: "hola@prod.cl",
      email_use_event_image: true,
      email_access: null,
    });
  });
  it("devuelve errores en español por campo y no corta en silencio", () => {
    const { errors } = parseEmailSettings(
      fd({
        email_welcome: "a".repeat(281),
        email_access: "a".repeat(601),
        email_rules: "b".repeat(601),
        email_directions: "c".repeat(401),
        contact_email: "a@b.cl\nBcc: x@y.cl",
        contact_instagram: "https://evil.com",
        contact_whatsapp: "12",
      })
    );
    expect(Object.keys(errors).sort()).toEqual(["contact_email", "contact_instagram", "contact_whatsapp", "email_access", "email_directions", "email_rules", "email_welcome"]);
    expect(errors.email_welcome).toMatch(/280/);
    expect(errors.contact_email).toMatch(/correo/);
  });
  it("la nota por tipo de entrada admite hasta 300", () => {
    expect(parseTicketNote(fd({ email_note: "a".repeat(300) })).error).toBeUndefined();
    expect(parseTicketNote(fd({ email_note: "a".repeat(301) })).error).toMatch(/300/);
    expect(parseTicketNote(fd({ email_note: "  " })).value).toBeNull();
  });
});
