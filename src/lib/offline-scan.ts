/**
 * Escáner sin conexión: lógica pura (sin red ni IndexedDB) para validar
 * entradas contra una lista descargada y llevar la cola de ingresos pendientes.
 *
 * El manifiesto nunca trae el QR crudo: solo su SHA-256 (hex). El celular
 * calcula el hash del QR escaneado y lo busca en la lista.
 */

export type TicketStatus = "valid" | "used" | "cancelled" | string;

/** Fila del manifiesto: h = hash del QR, s = estado, n = titular, t = tipo, u = hora de uso. */
export interface ManifestEntry {
  h: string;
  s: TicketStatus;
  n: string | null;
  t: string | null;
  u: string | null;
}

export type ManifestIndex = Map<string, ManifestEntry>;

export type LocalVerdict = "ok" | "already_used" | "cancelled" | "not_found";

export interface LocalScan {
  verdict: LocalVerdict;
  entry: ManifestEntry | null;
}

/** Ingreso hecho sin conexión, pendiente de enviar al servidor. */
export interface PendingOp {
  opId: string;
  qr: string;
  eventId: string;
  scannedAt: string;
  /** Intentos de envío cuyo resultado no se llegó a conocer (corte de red a medias). */
  attempts?: number;
  firstAttemptAt?: string;
}

export interface SyncConflict {
  opId: string;
  qr: string;
  eventId: string;
  scannedAt: string;
  reason: string;
  holderName: string | null;
  ticketType: string | null;
  serverUsedAt: string | null;
  recordedAt: string;
}

/** Los QR son UUID: se comparan sin espacios ni mayúsculas, igual que el servidor. */
export function normalizeQr(qr: string): string {
  return qr.trim().toLowerCase();
}

export async function hashQr(qr: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeQr(qr));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildIndex(entries: ManifestEntry[]): ManifestIndex {
  return new Map(entries.map((e) => [e.h, e]));
}

export function findEntry(index: ManifestIndex, hash: string): ManifestEntry | null {
  return index.get(hash) ?? null;
}

/**
 * Valida un escaneo contra la lista local. Si la entrada es válida la marca
 * como usada EN EL ÍNDICE (muta el índice y reemplaza la fila por una copia).
 */
export function applyLocalScan(index: ManifestIndex, hash: string, scannedAt: string): LocalScan {
  const entry = findEntry(index, hash);
  if (!entry) return { verdict: "not_found", entry: null };
  if (entry.s === "cancelled") return { verdict: "cancelled", entry };
  if (entry.s === "used") return { verdict: "already_used", entry };
  const updated: ManifestEntry = { ...entry, s: "used", u: scannedAt };
  index.set(hash, updated);
  return { verdict: "ok", entry: updated };
}

/** Marca una entrada como usada (p. ej. tras un check-in confirmado por el servidor). */
export function markUsed(index: ManifestIndex, hash: string, usedAt: string): ManifestEntry | null {
  const entry = index.get(hash);
  if (!entry) return null;
  const updated: ManifestEntry = { ...entry, s: "used", u: entry.u ?? usedAt };
  index.set(hash, updated);
  return updated;
}

// ---- Cola de pendientes -----------------------------------------------------

export function createOp(qr: string, eventId: string, scannedAt: string, opId: string): PendingOp {
  return { opId, qr: normalizeQr(qr), eventId, scannedAt };
}

/** Agrega al final; no duplica el mismo opId ni el mismo QR del mismo evento. */
export function enqueue(queue: PendingOp[], op: PendingOp): PendingOp[] {
  if (queue.some((q) => q.opId === op.opId || (q.eventId === op.eventId && q.qr === op.qr))) return queue;
  return [...queue, op];
}

export function dequeue(queue: PendingOp[], opId: string): PendingOp[] {
  return queue.filter((q) => q.opId !== opId);
}

export function pendingFor(queue: PendingOp[], eventId: string): PendingOp[] {
  return queue.filter((q) => q.eventId === eventId);
}

/** Reaplica la cola sobre un manifiesto recién descargado (el servidor aún no los conoce). */
export function overlayPending(index: ManifestIndex, ops: PendingOp[], hashes: Map<string, string>) {
  for (const op of ops) {
    const h = hashes.get(op.opId);
    if (h) markUsed(index, h, op.scannedAt);
  }
}

// ---- Respuesta del servidor al sincronizar ------------------------------------

export interface ValidateResponse {
  result?: string;
  holder_name?: string | null;
  ticket_type?: string | null;
  used_at?: string | null;
}

export type SyncOutcome =
  | { kind: "confirmed" }
  | { kind: "conflict"; reason: string };

/**
 * Decide qué hacer con un ingreso offline según lo que dijo el servidor.
 * Si un envío anterior se cortó sin respuesta (attempts > 0) y el servidor
 * marcó la entrada como usada DESPUÉS de ese primer intento, casi seguro fue
 * nuestro propio envío: se da por confirmado y no se acusa un conflicto falso.
 */
export function classifySync(op: PendingOp, res: ValidateResponse): SyncOutcome {
  switch (res.result) {
    case "ok":
      return { kind: "confirmed" };
    case "already_used": {
      if (
        op.firstAttemptAt &&
        res.used_at &&
        new Date(res.used_at).getTime() >= new Date(op.firstAttemptAt).getTime()
      ) {
        return { kind: "confirmed" };
      }
      return { kind: "conflict", reason: "already_used" };
    }
    case "cancelled":
      return { kind: "conflict", reason: "cancelled" };
    case "wrong_event":
      return { kind: "conflict", reason: "wrong_event" };
    case "not_found":
      return { kind: "conflict", reason: "not_found" };
    default:
      return { kind: "conflict", reason: res.result ?? "error" };
  }
}

export function minutesAgo(fromMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - fromMs) / 60000));
}
