"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Sheet from "@/components/dashboard/sheet";
import {
  applyLocalScan,
  buildIndex,
  classifySync,
  createOp,
  dequeue,
  enqueue,
  hashQr,
  markUsed,
  minutesAgo,
  type ManifestEntry,
  type ManifestIndex,
  type PendingOp,
  type SyncConflict,
  type ValidateResponse,
} from "@/lib/offline-scan";
import {
  deleteConflict,
  deleteOp,
  listConflicts,
  listOps,
  loadManifest,
  putConflict,
  putOp,
  putTicket,
  saveManifest,
} from "@/lib/offline-store";

type Verdict = "ok" | "already_used" | "wrong_event" | "cancelled" | "not_found" | "error" | "forbidden";

interface ScanResponse {
  result?: Verdict;
  holder_name?: string | null;
  holder_email?: string | null;
  ticket_type?: string | null;
  used_at?: string | null;
  other_event_title?: string | null;
  counts?: { checked_in: number; total: number } | null;
  error?: string;
}

interface Banner {
  verdict: Verdict;
  title: string;
  lines: string[];
  offline?: boolean;
}

interface SearchResult {
  qrCode: string;
  status: string;
  usedAt: string | null;
  holderName: string | null;
  holderEmail: string | null;
  ticketType: string | null;
}

const RESET_MS = 2500;
const ONLINE_TIMEOUT_MS = 6000;
const SYNC_TIMEOUT_MS = 10000;
const SYNC_INTERVAL_MS = 20000;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

function newOpId() {
  try {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // contexto no seguro
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

const REASON_LABEL: Record<string, string> = {
  already_used: "Ya estaba usada en el servidor",
  cancelled: "Fue anulada antes de sincronizar",
  wrong_event: "Es de otro evento",
  not_found: "No existe en el servidor",
};
const SAME_CODE_COOLDOWN_MS = 6000;

const STYLES: Record<Verdict, string> = {
  ok: "bg-emerald-600 text-white",
  already_used: "bg-red-600 text-white",
  wrong_event: "bg-amber-500 text-black",
  cancelled: "bg-red-600 text-white",
  not_found: "bg-red-600 text-white",
  error: "bg-red-700 text-white",
  forbidden: "bg-red-700 text-white",
};

function hhmm(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Santiago",
  });
}

function toBanner(r: ScanResponse): Banner {
  switch (r.result) {
    case "ok":
      return {
        verdict: "ok",
        title: "VÁLIDA",
        lines: [r.holder_name || r.holder_email || "", r.ticket_type || ""].filter(Boolean),
      };
    case "already_used":
      return {
        verdict: "already_used",
        title: `YA USADA${r.used_at ? ` a las ${hhmm(r.used_at)}` : ""}`,
        lines: [r.holder_name || "", r.ticket_type || ""].filter(Boolean),
      };
    case "wrong_event":
      return {
        verdict: "wrong_event",
        title: "OTRO EVENTO",
        lines: r.other_event_title ? [`Esta entrada es de "${r.other_event_title}"`] : [],
      };
    case "cancelled":
      return { verdict: "cancelled", title: "ANULADA", lines: [r.holder_name || ""].filter(Boolean) };
    case "not_found":
      return { verdict: "not_found", title: "NO EXISTE", lines: ["El código no corresponde a ninguna entrada"] };
    default:
      return { verdict: "error", title: "ERROR", lines: [r.error ?? "No se pudo validar. Revisa tu conexión."] };
  }
}

export default function ScannerClient({
  eventId,
  eventTitle,
  initialCounts,
  backHref,
}: {
  eventId: string;
  eventTitle: string;
  initialCounts: { checkedIn: number; total: number };
  backHref: string;
}) {
  const [started, setStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [counts, setCounts] = useState(initialCounts);

  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
  const [listMeta, setListMeta] = useState<{ fetchedAt: number; count: number } | null>(null);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("idle");
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [conflictsOpen, setConflictsOpen] = useState(false);

  const indexRef = useRef<ManifestIndex | null>(null);
  const queueRef = useRef<PendingOp[]>([]);
  const syncingRef = useRef(false);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const setQueue = useCallback((next: PendingOp[]) => {
    queueRef.current = next;
    setPending(next.length);
  }, []);

  const beep = useCallback((verdict: Verdict) => {
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = verdict === "ok" ? 880 : 220;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + (verdict === "ok" ? 0.12 : 0.35));
    } catch {
      // sin audio: no es crítico
    }
  }, []);

  const showBanner = useCallback(
    (b: Banner) => {
      setBanner(b);
      try {
        navigator.vibrate?.(b.verdict === "ok" ? 80 : [120, 80, 120]);
      } catch {
        // vibración no soportada
      }
      beep(b.verdict);

      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setBanner(null);
        busyRef.current = false;
      }, RESET_MS);
    },
    [beep]
  );

  const showResult = useCallback(
    (r: ScanResponse) => {
      if (r.counts) setCounts({ checkedIn: r.counts.checked_in, total: r.counts.total });
      showBanner(toBanner(r));
    },
    [showBanner]
  );

  // ---- Lista local (manifiesto) -------------------------------------------

  const hashOps = useCallback(async (ops: PendingOp[]) => {
    const map = new Map<string, string>();
    for (const op of ops) map.set(op.opId, await hashQr(op.qr));
    return map;
  }, []);

  const downloadList = useCallback(async () => {
    if (!navigator.onLine) return;
    setListState("loading");
    try {
      const res = await fetch(`/api/scan/${eventId}/manifest`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: { entries: ManifestEntry[] } = await res.json();
      const index = buildIndex(data.entries);
      // Lo que escaneamos sin conexión y aún no llegó al servidor sigue marcado como usado.
      const ops = queueRef.current;
      const hashes = await hashOps(ops);
      for (const op of ops) {
        const h = hashes.get(op.opId);
        if (h) markUsed(index, h, op.scannedAt);
      }
      indexRef.current = index;
      const fetchedAt = Date.now();
      setListMeta({ fetchedAt, count: data.entries.length });
      setNow(fetchedAt);
      setListState("idle");
      void saveManifest(eventId, data.entries, fetchedAt);
    } catch {
      setListState("error");
    }
  }, [eventId, hashOps]);

  // ---- Envío de la cola ------------------------------------------------------

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine || queueRef.current.length === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (;;) {
        const op = queueRef.current[0];
        if (!op) break;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch("/api/tickets/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qr: op.qr, eventId: op.eventId }),
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timer);
          if ((err as Error).name === "AbortError") {
            // Sin respuesta: puede que el servidor sí la haya procesado. Se anota para no acusar un conflicto falso.
            const marked: PendingOp = {
              ...op,
              attempts: (op.attempts ?? 0) + 1,
              firstAttemptAt: op.firstAttemptAt ?? new Date().toISOString(),
            };
            queueRef.current = queueRef.current.map((q) => (q.opId === op.opId ? marked : q));
            void putOp(marked);
          }
          break;
        }
        clearTimeout(timer);

        // Sesión vencida o servidor caído: se conserva la cola para reintentar.
        if (res.status === 401 || res.status === 403 || res.status >= 500) break;

        let data: ValidateResponse & { counts?: { checked_in: number; total: number } | null } = {};
        try {
          data = await res.json();
        } catch {
          break;
        }

        const outcome = res.ok ? classifySync(op, data) : ({ kind: "conflict", reason: "invalid" } as const);
        if (outcome.kind === "conflict") {
          const conflict: SyncConflict = {
            opId: op.opId,
            qr: op.qr,
            eventId: op.eventId,
            scannedAt: op.scannedAt,
            reason: outcome.reason,
            holderName: data.holder_name ?? null,
            ticketType: data.ticket_type ?? null,
            serverUsedAt: data.used_at ?? null,
            recordedAt: new Date().toISOString(),
          };
          await putConflict(conflict);
          setConflicts((prev) => [conflict, ...prev.filter((c) => c.opId !== conflict.opId)]);
        }
        if (data.counts) setCounts({ checkedIn: data.counts.checked_in, total: data.counts.total });
        await deleteOp(op.opId);
        setQueue(dequeue(queueRef.current, op.opId));
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [setQueue]);

  // ---- Validación -------------------------------------------------------------

  const checkInOffline = useCallback(
    async (qr: string, uncertainSince?: string): Promise<Banner> => {
      const index = indexRef.current;
      if (!index) {
        return {
          verdict: "error",
          title: "SIN LISTA",
          lines: ["Sin conexión y sin lista descargada. Conéctate para descargarla."],
          offline: true,
        };
      }
      const scannedAt = new Date().toISOString();
      const hash = await hashQr(qr);
      const { verdict, entry } = applyLocalScan(index, hash, scannedAt);
      const who = [entry?.n ?? "", entry?.t ?? ""].filter(Boolean);

      if (verdict === "ok" && entry) {
        let op = createOp(qr, eventId, scannedAt, newOpId());
        if (uncertainSince) op = { ...op, attempts: 1, firstAttemptAt: uncertainSince };
        setQueue(enqueue(queueRef.current, op));
        void putOp(op);
        void putTicket(eventId, entry);
        setCounts((c) => ({ ...c, checkedIn: c.checkedIn + 1 }));
        return { verdict: "ok", title: "VÁLIDA", lines: who, offline: true };
      }
      if (verdict === "already_used") {
        return {
          verdict: "already_used",
          title: `YA USADA${entry?.u ? ` a las ${hhmm(entry.u)}` : ""}`,
          lines: who,
          offline: true,
        };
      }
      if (verdict === "cancelled") {
        return { verdict: "cancelled", title: "ANULADA", lines: who.slice(0, 1), offline: true };
      }
      return {
        verdict: "not_found",
        title: "NO ENCONTRADA",
        lines: ["Sin conexión: el código no está en la lista descargada"],
        offline: true,
      };
    },
    [eventId, setQueue]
  );

  const checkIn = useCallback(
    async (qr: string): Promise<{ response?: ScanResponse; banner?: Banner }> => {
      if (!navigator.onLine) return { banner: await checkInOffline(qr) };

      const startedAt = new Date().toISOString();
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, ONLINE_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch("/api/tickets/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr, eventId }),
          signal: controller.signal,
        });
      } catch {
        // Sin red (o muy lenta): se valida con la lista descargada.
        return { banner: await checkInOffline(qr, timedOut ? startedAt : undefined) };
      } finally {
        clearTimeout(timer);
      }

      try {
        const data: ScanResponse = await res.json();
        if (res.status === 403) return { response: { result: "forbidden", error: data.error ?? "Sin acceso" } };
        if (!res.ok) return { response: { result: "error", error: data.error } };
        // Mantiene la lista local al día para cuando se corte internet.
        const index = indexRef.current;
        if (index && (data.result === "ok" || data.result === "already_used")) {
          const h = await hashQr(qr);
          const updated = markUsed(index, h, data.used_at ?? new Date().toISOString());
          if (updated) void putTicket(eventId, updated);
        }
        return { response: data };
      } catch {
        return { response: { result: "error", error: "No se pudo validar. Revisa tu conexión." } };
      }
    },
    [eventId, checkInOffline]
  );

  const runCheckIn = useCallback(
    async (qr: string) => {
      const out = await checkIn(qr);
      if (out.banner) {
        showBanner(out.banner);
      } else if (out.response) {
        showResult(out.response);
      }
    },
    [checkIn, showBanner, showResult]
  );

  const handleDecoded = useCallback(
    async (text: string) => {
      if (busyRef.current) return;
      const t = Date.now();
      const last = lastRef.current;
      if (last && last.code === text && t - last.at < SAME_CODE_COOLDOWN_MS) return;
      busyRef.current = true;
      lastRef.current = { code: text, at: t };
      await runCheckIn(text);
    },
    [runCheckIn]
  );

  // Carga inicial: lista, cola y conflictos guardados en el dispositivo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, ops, savedConflicts] = await Promise.all([
        loadManifest(eventId),
        listOps(eventId),
        listConflicts(eventId),
      ]);
      if (cancelled) return;
      if (stored) {
        const index = buildIndex(stored.entries);
        const hashes = await hashOps(ops);
        for (const op of ops) {
          const h = hashes.get(op.opId);
          if (h) markUsed(index, h, op.scannedAt);
        }
        if (cancelled) return;
        indexRef.current = index;
        setListMeta({ fetchedAt: stored.meta.fetchedAt, count: stored.meta.count });
      }
      setNow(Date.now());
      setQueue(ops);
      setConflicts(savedConflicts.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
      if (navigator.onLine) {
        void syncQueue().then(() => downloadList());
        // Deja lista la librería de la cámara en caché para abrir el escáner sin internet.
        void import("html5-qrcode").catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, hashOps, setQueue, syncQueue, downloadList]);

  // Al volver internet y cada tanto: enviar pendientes.
  useEffect(() => {
    const onOnline = () => void syncQueue();
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => {
      setNow(Date.now());
      void syncQueue();
    }, SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [syncQueue]);

  // Cámara
  useEffect(() => {
    if (!started) return;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.75);
              return { width: size, height: size };
            },
          },
          (decoded) => void handleDecoded(decoded),
          undefined
        );
      } catch (err) {
        console.error("No se pudo iniciar la cámara", err);
        setCameraError("No pudimos abrir la cámara. Revisa los permisos del navegador o usa la búsqueda manual.");
      }
    })();

    return () => {
      cancelled = true;
      scanner
        ?.stop()
        .then(() => scanner?.clear())
        .catch(() => {});
    };
  }, [started, handleDecoded]);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  function start() {
    // Crear el AudioContext dentro del gesto del usuario para que el navegador permita el pitido.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    } catch {
      // sin audio
    }
    setStarted(true);
  }

  const listAge = listMeta ? minutesAgo(listMeta.fetchedAt, Math.max(now, listMeta.fetchedAt)) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#090909] text-[#f5f4f1]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090909]/95 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={backHref} className="text-xs text-neutral-500 hover:text-neutral-300">
              ← Salir
            </Link>
            <p className="truncate text-sm font-bold">{eventTitle}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500">Ingresados</p>
            <p className="text-2xl font-black leading-none" aria-live="polite">
              {counts.checkedIn}
              <span className="text-base font-semibold text-neutral-500"> / {counts.total}</span>
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              online ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
            {online ? "En línea" : "Sin conexión"}
            {pending > 0 ? ` · ${pending} por enviar${syncing ? "…" : ""}` : ""}
          </span>
          {conflicts.length > 0 ? (
            <button
              type="button"
              onClick={() => setConflictsOpen(true)}
              className="inline-flex min-h-8 items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"
            >
              {conflicts.length} {conflicts.length === 1 ? "conflicto" : "conflictos"}
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4">
        {!started ? (
          <button
            type="button"
            onClick={start}
            className="rounded-2xl bg-[var(--anc-accent)] px-6 py-10 text-xl font-black uppercase tracking-wide text-[#120d1b] active:scale-[.99]"
          >
            Activar cámara y escanear
          </button>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
            <div id="qr-reader" className="w-full [&_video]:w-full [&_video]:object-cover" />
          </div>
        )}
        {cameraError ? <p className="text-sm text-red-400">{cameraError}</p> : null}

        <section className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#101010] px-4 py-3">
          <div className="min-w-0 text-sm">
            {listState === "loading" ? (
              <p className="text-neutral-300">Descargando lista…</p>
            ) : listMeta ? (
              <p className="text-neutral-200">
                Lista descargada · {listMeta.count} {listMeta.count === 1 ? "entrada" : "entradas"} ·{" "}
                {listAge < 1 ? "hace un momento" : `hace ${listAge} min`}
              </p>
            ) : (
              <p className="text-neutral-400">Sin lista descargada: sin internet no se podrá validar.</p>
            )}
            {listState === "error" ? <p className="mt-0.5 text-xs text-red-400">No se pudo descargar la lista.</p> : null}
          </div>
          <button
            type="button"
            onClick={() => void downloadList()}
            disabled={!online || listState === "loading"}
            className="min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40"
          >
            {listMeta ? "Actualizar" : "Descargar"}
          </button>
        </section>

        <ManualSearch eventId={eventId} online={online} onCheckIn={async (qr) => {
          busyRef.current = true;
          lastRef.current = { code: qr, at: Date.now() };
          await runCheckIn(qr);
        }} />
      </main>

      <Sheet open={conflictsOpen} onClose={() => setConflictsOpen(false)} title="Conflictos">
        <p className="mb-4 text-sm text-[var(--anc-muted-text)]">
          Entradas que diste por válidas sin conexión, pero que el servidor ya tenía registradas. Revisa si la persona
          ya entró por otra puerta.
        </p>
        {conflicts.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay conflictos.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {conflicts.map((c) => (
              <li key={c.opId} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-white">{c.holderName || "Sin nombre"}</p>
                  {c.ticketType ? <p className="text-xs text-neutral-500">{c.ticketType}</p> : null}
                  <p className="mt-1 text-xs text-red-300">
                    {REASON_LABEL[c.reason] ?? "El servidor la rechazó"}
                    {c.serverUsedAt ? ` (${hhmm(c.serverUsedAt)})` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">Tú la escaneaste a las {hhmm(c.scannedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void deleteConflict(c.opId);
                    setConflicts((prev) => prev.filter((x) => x.opId !== c.opId));
                  }}
                  className="min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm font-semibold"
                >
                  Descartar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {banner ? (
        <button
          type="button"
          onClick={() => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
            setBanner(null);
            busyRef.current = false;
          }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center ${STYLES[banner.verdict]}`}
          aria-live="assertive"
        >
          {banner.offline ? (
            <span className="rounded-full bg-black/30 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[.16em]">
              Sin conexión
            </span>
          ) : null}
          <span className="text-5xl font-black leading-none tracking-tight sm:text-7xl">{banner.title}</span>
          {banner.lines.map((line) => (
            <span key={line} className="text-2xl font-semibold sm:text-3xl">
              {line}
            </span>
          ))}
          <span className="mt-6 text-sm font-medium opacity-70">Toca para seguir escaneando</span>
        </button>
      ) : null}
    </div>
  );
}

function ManualSearch({
  eventId,
  online,
  onCheckIn,
}: {
  eventId: string;
  online: boolean;
  onCheckIn: (qr: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searching = query.trim().length >= 2;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !online) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tickets/search?eventId=${eventId}&q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo buscar");
        setResults(data.results);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("No se pudo buscar. Revisa tu conexión.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, eventId, online]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#101010] p-4">
      <h2 className="text-sm font-bold">Búsqueda manual</h2>
      <p className="mb-3 text-xs text-neutral-500">Por nombre, correo o código de la entrada.</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar asistente…"
        className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-3 text-base text-[#f5f4f1] placeholder:text-neutral-500 focus:border-[var(--anc-accent)] focus:outline-none"
      />
      {!online ? (
        <p className="mt-3 text-xs text-amber-300">La búsqueda manual necesita conexión. Escanea el QR para validar sin internet.</p>
      ) : null}
      {loading ? <p className="mt-3 text-xs text-neutral-500">Buscando…</p> : null}
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      {searching && results && results.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-neutral-400">Sin resultados.</p>
      ) : null}
      {searching && results && results.length > 0 ? (
        <ul className="mt-3 divide-y divide-white/10">
          {results.map((r) => {
            const usable = r.status === "valid";
            return (
              <li key={r.qrCode} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.holderName || r.holderEmail || "Sin nombre"}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {[r.ticketType, r.holderName ? r.holderEmail : null].filter(Boolean).join(" · ")}
                  </p>
                  {r.status === "used" ? (
                    <p className="text-xs text-red-400">Ya usada a las {hhmm(r.usedAt)}</p>
                  ) : r.status === "cancelled" ? (
                    <p className="text-xs text-red-400">Anulada</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!usable}
                  onClick={() => onCheckIn(r.qrCode)}
                  className="shrink-0 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition active:scale-95 disabled:opacity-30"
                >
                  Dar ingreso
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
