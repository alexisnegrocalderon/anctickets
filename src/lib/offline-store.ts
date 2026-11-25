/**
 * Persistencia del escáner sin conexión en IndexedDB. Todo es "mejor esfuerzo":
 * si IndexedDB no existe o falla, las funciones devuelven valores vacíos y el
 * escáner sigue funcionando solo en línea.
 */
import type { ManifestEntry, PendingOp, SyncConflict } from "./offline-scan";

const DB_NAME = "anc-scanner";
const DB_VERSION = 1;

interface TicketRow extends ManifestEntry {
  k: string; // `${eventId}:${h}`
  eventId: string;
}
export interface ManifestMeta {
  eventId: string;
  fetchedAt: number;
  count: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("meta", { keyPath: "eventId" });
        db.createObjectStore("tickets", { keyPath: "k" }).createIndex("eventId", "eventId");
        db.createObjectStore("queue", { keyPath: "opId" });
        db.createObjectStore("conflicts", { keyPath: "opId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function safe<T>(fallback: T, fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await openDb();
    if (!db) return fallback;
    return await fn(db);
  } catch {
    return fallback;
  }
}

/** Reemplaza la lista del evento por la recién descargada. */
export function saveManifest(eventId: string, entries: ManifestEntry[], fetchedAt: number): Promise<boolean> {
  return safe(false, async (db) => {
    const tx = db.transaction(["tickets", "meta"], "readwrite");
    const tickets = tx.objectStore("tickets");
    const range = IDBKeyRange.only(eventId);
    const cursorReq = tickets.index("eventId").openKeyCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        tickets.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        for (const e of entries) tickets.put({ ...e, k: `${eventId}:${e.h}`, eventId } satisfies TicketRow);
        tx.objectStore("meta").put({ eventId, fetchedAt, count: entries.length } satisfies ManifestMeta);
      }
    };
    return done(tx);
  });
}

export function loadManifest(eventId: string): Promise<{ meta: ManifestMeta; entries: ManifestEntry[] } | null> {
  return safe(null, async (db) => {
    const tx = db.transaction(["tickets", "meta"], "readonly");
    const meta = await reqResult<ManifestMeta | undefined>(tx.objectStore("meta").get(eventId));
    if (!meta) return null;
    const rows = (await reqResult<TicketRow[]>(tx.objectStore("tickets").index("eventId").getAll(eventId))) ?? [];
    return { meta, entries: rows.map(({ h, s, n, t, u }) => ({ h, s, n, t, u })) };
  });
}

export function putTicket(eventId: string, entry: ManifestEntry): Promise<boolean> {
  return safe(false, async (db) => {
    const tx = db.transaction("tickets", "readwrite");
    tx.objectStore("tickets").put({ ...entry, k: `${eventId}:${entry.h}`, eventId } satisfies TicketRow);
    return done(tx);
  });
}

function putOne(store: "queue" | "conflicts", value: PendingOp | SyncConflict): Promise<boolean> {
  return safe(false, async (db) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    return done(tx);
  });
}

function deleteOne(store: "queue" | "conflicts", key: string): Promise<boolean> {
  return safe(false, async (db) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    return done(tx);
  });
}

async function listFor<T extends { eventId: string }>(store: "queue" | "conflicts", eventId: string): Promise<T[]> {
  return safe<T[]>([], async (db) => {
    const all = (await reqResult<T[]>(db.transaction(store, "readonly").objectStore(store).getAll())) ?? [];
    return all.filter((x) => x.eventId === eventId);
  });
}

export const putOp = (op: PendingOp) => putOne("queue", op);
export const deleteOp = (opId: string) => deleteOne("queue", opId);
export const listOps = (eventId: string) => listFor<PendingOp>("queue", eventId);

export const putConflict = (c: SyncConflict) => putOne("conflicts", c);
export const deleteConflict = (opId: string) => deleteOne("conflicts", opId);
export const listConflicts = (eventId: string) => listFor<SyncConflict>("conflicts", eventId);
