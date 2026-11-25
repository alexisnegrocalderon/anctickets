"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

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

  const showResult = useCallback(
    (r: ScanResponse) => {
      const b = toBanner(r);
      setBanner(b);
      if (r.counts) setCounts({ checkedIn: r.counts.checked_in, total: r.counts.total });
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

  const checkIn = useCallback(
    async (qr: string): Promise<ScanResponse> => {
      try {
        const res = await fetch("/api/tickets/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr, eventId }),
        });
        const data: ScanResponse = await res.json();
        if (res.status === 403) return { result: "forbidden", error: data.error ?? "Sin acceso" };
        if (!res.ok) return { result: "error", error: data.error };
        return data;
      } catch {
        return { result: "error", error: "Sin conexión. Reintenta." };
      }
    },
    [eventId]
  );

  const handleDecoded = useCallback(
    async (text: string) => {
      if (busyRef.current) return;
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.code === text && now - last.at < SAME_CODE_COOLDOWN_MS) return;
      busyRef.current = true;
      lastRef.current = { code: text, at: now };
      showResult(await checkIn(text));
    },
    [checkIn, showResult]
  );

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

  return (
    <div className="flex min-h-dvh flex-col bg-[#090909] text-[#f5f4f1]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#090909]/95 px-4 py-3 backdrop-blur">
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
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-4">
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

        <ManualSearch eventId={eventId} onCheckIn={async (qr) => {
          busyRef.current = true;
          lastRef.current = { code: qr, at: Date.now() };
          showResult(await checkIn(qr));
        }} />
      </main>

      {banner ? (
        <button
          type="button"
          onClick={() => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
            setBanner(null);
            busyRef.current = false;
          }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center ${STYLES[banner.verdict]}`}
          aria-live="assertive"
        >
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

function ManualSearch({ eventId, onCheckIn }: { eventId: string; onCheckIn: (qr: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
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
  }, [query, eventId]);

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
      {loading ? <p className="mt-3 text-xs text-neutral-500">Buscando…</p> : null}
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      {results && results.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-neutral-400">Sin resultados.</p>
      ) : null}
      {results && results.length > 0 ? (
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
