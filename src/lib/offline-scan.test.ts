import { describe, expect, it } from "vitest";
import {
  applyLocalScan,
  buildIndex,
  classifySync,
  createOp,
  dequeue,
  enqueue,
  findEntry,
  hashQr,
  markUsed,
  pendingFor,
  type ManifestEntry,
} from "./offline-scan";

const QR = "0b3f2a52-6f0e-4a0c-9f7e-2f0c1c7a1d11";
const QR2 = "11111111-2222-4333-8444-555555555555";

async function sample() {
  const entries: ManifestEntry[] = [
    { h: await hashQr(QR), s: "valid", n: "Ana", t: "General", u: null },
    { h: await hashQr(QR2), s: "cancelled", n: "Beto", t: "VIP", u: null },
  ];
  return buildIndex(entries);
}

describe("hashQr", () => {
  it("es SHA-256 hex determinista", async () => {
    // sha256("abc")
    expect(await hashQr("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("ignora mayúsculas y espacios", async () => {
    expect(await hashQr(`  ${QR.toUpperCase()} `)).toBe(await hashQr(QR));
  });
});

describe("búsqueda y escaneo local", () => {
  it("encuentra por hash y no encuentra desconocidos", async () => {
    const idx = await sample();
    expect(findEntry(idx, await hashQr(QR))?.n).toBe("Ana");
    expect(findEntry(idx, await hashQr("otro"))).toBeNull();
  });

  it("primer escaneo ok, segundo ya usada", async () => {
    const idx = await sample();
    const h = await hashQr(QR);
    const a = applyLocalScan(idx, h, "2026-01-01T20:00:00.000Z");
    expect(a.verdict).toBe("ok");
    expect(a.entry?.u).toBe("2026-01-01T20:00:00.000Z");
    const b = applyLocalScan(idx, h, "2026-01-01T20:01:00.000Z");
    expect(b.verdict).toBe("already_used");
    expect(b.entry?.u).toBe("2026-01-01T20:00:00.000Z");
  });

  it("anulada y no encontrada", async () => {
    const idx = await sample();
    expect(applyLocalScan(idx, await hashQr(QR2), "x").verdict).toBe("cancelled");
    expect(applyLocalScan(idx, await hashQr("nada"), "x").verdict).toBe("not_found");
  });

  it("markUsed no pisa la hora existente", async () => {
    const idx = await sample();
    const h = await hashQr(QR);
    markUsed(idx, h, "a");
    markUsed(idx, h, "b");
    expect(findEntry(idx, h)?.u).toBe("a");
  });
});

describe("cola de pendientes", () => {
  it("encola, no duplica y quita por opId", () => {
    const op1 = createOp(` ${QR.toUpperCase()}`, "ev1", "t1", "op-1");
    expect(op1.qr).toBe(QR);
    let q = enqueue([], op1);
    q = enqueue(q, op1);
    q = enqueue(q, createOp(QR, "ev1", "t2", "op-2")); // mismo QR y evento
    expect(q).toHaveLength(1);
    q = enqueue(q, createOp(QR2, "ev2", "t3", "op-3"));
    expect(pendingFor(q, "ev2")).toHaveLength(1);
    q = dequeue(q, "op-1");
    expect(q.map((o) => o.opId)).toEqual(["op-3"]);
  });
});

describe("classifySync", () => {
  const op = createOp(QR, "ev1", "2026-01-01T20:00:00.000Z", "op-1");
  it("ok confirma", () => expect(classifySync(op, { result: "ok" }).kind).toBe("confirmed"));
  it("already_used es conflicto", () => {
    expect(classifySync(op, { result: "already_used", used_at: "2026-01-01T19:00:00.000Z" })).toEqual({
      kind: "conflict",
      reason: "already_used",
    });
  });
  it("already_used tras un envío cortado se da por confirmado", () => {
    const retried = { ...op, attempts: 1, firstAttemptAt: "2026-01-01T21:00:00.000Z" };
    expect(classifySync(retried, { result: "already_used", used_at: "2026-01-01T21:00:01.000Z" }).kind).toBe(
      "confirmed"
    );
  });
});
