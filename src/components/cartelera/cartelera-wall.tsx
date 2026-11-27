"use client";

/**
 * La Cartelera: pared vertical con scroll-snap, un evento por pantalla.
 * Comportamiento tomado del prototipo (prototipo.html):
 *  - Afiche con paralaje suave, cuenta regresiva en vivo y etiquetas reales.
 *  - Columna de reacciones (🔥 🙌 😍 🎉): piden Google al primer toque.
 *  - Gesto "Desliza hacia arriba" solo la primera vez; píldora "Siguiente".
 *  - Filtros, calendario de 21 días y compra en una hoja con el mismo
 *    formulario (y checkout) de la página del evento.
 */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import BuyForm from "@/app/(app)/events/[id]/buy-form";
import { setReaction } from "@/app/eventos/actions";
import ProducerLink from "@/components/doors/producer-link";
import Tico from "@/components/tico";
import { startGoogle } from "@/components/doors/google-start";
import {
  FILTER_LABEL,
  REACTIONS,
  calendarDays,
  chileDay,
  eventBadges,
  matchesFilter,
  reactionCountLabel,
  ticoSay,
  type CarteleraFilter,
  type ReactionKey,
} from "@/lib/cartelera";
import type { TicketType } from "@/lib/database.types";
import { formatChileDate, tierStatus } from "@/lib/tiers";

export type WallEvent = {
  id: string;
  title: string;
  slug: string;
  venue: string | null;
  eventDate: string;
  imageUrl: string | null;
  theme: { from: string; to: string; ink: string; text: string };
  tiers: TicketType[];
  counts: Partial<Record<ReactionKey, number>>;
  mine: ReactionKey[];
  salesSuspended: boolean;
};

const SWIPED_KEY = "anc-swiped";
const PENDING_KEY = "anc-pending-reaction";
const FILTERS: CarteleraFilter[] = ["todo", "noche", "semana", "mes"];

const money = (n: number) => `$${n.toLocaleString("es-CL")}`;

function storageGet(store: "local" | "session", key: string): string | null {
  try {
    return (store === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function storageSet(store: "local" | "session", key: string, value: string | null) {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // Ventana privada o almacenamiento bloqueado: se sigue sin recordar.
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------------- Cuenta regresiva ---------------- */
function Countdown({ target, serverNow, live }: { target: number; serverNow: number; live: boolean }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!live) return;
    // Corrige el reloj del navegador con la hora del servidor al cargar.
    const skew = serverNow - Date.now();
    const tick = () => setNow(Date.now() + skew);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [live, serverNow]);

  let left = Math.max(0, target - now);
  const d = Math.floor(left / 86_400_000);
  left -= d * 86_400_000;
  const h = Math.floor(left / 3_600_000);
  left -= h * 3_600_000;
  const m = Math.floor(left / 60_000);
  left -= m * 60_000;
  const s = Math.floor(left / 1000);
  const cells: [number, string][] = [
    [d, "días"],
    [h, "horas"],
    [m, "min"],
    [s, "seg"],
  ];
  return (
    <div className="cw-count" role="timer" aria-label={`Faltan ${d} días, ${h} horas y ${m} minutos`}>
      {cells.map(([v, label]) => (
        <div key={label} className="cw-cell">
          <b aria-hidden="true">{String(v).padStart(2, "0")}</b>
          <span aria-hidden="true">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Botón principal de cada evento ---------------- */
function ctaFor(ev: WallEvent, now: number): { label: string; action: "buy" | "page" | "none" } {
  if (ev.salesSuspended || ev.tiers.length === 0) return { label: "Ver evento", action: "page" };
  const statuses = ev.tiers.map((t) => ({ t, s: tierStatus(t, now) }));
  const onSale = statuses.filter((x) => x.s === "on_sale").map((x) => x.t);
  if (onSale.length > 0) return { label: `Entradas desde ${money(Math.min(...onSale.map((t) => t.base_price)))}`, action: "buy" };
  if (statuses.every((x) => x.s === "sold_out")) return { label: "Agotado", action: "none" };
  const next = statuses
    .filter((x) => x.s === "upcoming" && x.t.sales_start)
    .map((x) => x.t.sales_start!)
    .sort()[0];
  if (next) return { label: `Abre el ${formatChileDate(next)}`, action: "none" };
  return { label: "Venta cerrada", action: "none" };
}

/* ---------------- Componente principal ---------------- */
export default function CarteleraWall({
  events,
  serverNow,
  isLoggedIn,
  focusSlug,
  refCode,
}: {
  events: WallEvent[];
  serverNow: number;
  isLoggedIn: boolean;
  focusSlug: string | null;
  refCode: string | null;
}) {
  const wallRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<CarteleraFilter>("todo");
  // Instante con el que se evalúa el filtro: el del servidor al cargar y el
  // del navegador cada vez que la persona elige uno.
  const [filterNow, setFilterNow] = useState(serverNow);
  const focusIndex = focusSlug ? events.findIndex((e) => e.slug === focusSlug) : -1;
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() =>
    new Set(focusIndex > 0 ? [0, 1, focusIndex, focusIndex + 1] : [0, 1]),
  );
  const [demo, setDemo] = useState(false);
  const [tease, setTease] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [selDay, setSelDay] = useState<string>(() => chileDay(serverNow));
  const [buying, setBuying] = useState<WallEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mine, setMine] = useState<Record<string, ReactionKey[]>>(() =>
    Object.fromEntries(events.map((e) => [e.id, e.mine])),
  );
  const [counts, setCounts] = useState<Record<string, Partial<Record<ReactionKey, number>>>>(() =>
    Object.fromEntries(events.map((e) => [e.id, e.counts])),
  );
  // Evento donde Tico está celebrando una reacción (unos segundos).
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ id: number; emoji: string; x: number; y: number; dx: number; r: number; delay: number }[]>([]);

  const list = useMemo(
    () => events.filter((e) => matchesFilter(e.eventDate, filter, filterNow)),
    [events, filter, filterNow],
  );
  const shown = list.length;
  // Con 1 o 2 eventos se agrega una pantalla final "Próximamente" para que no se vea vacía.
  const withComingSoon = shown > 0 && shown <= 2;
  const totalSlides = shown + (withComingSoon ? 1 : 0);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  }, []);

  /* --- índice visible, paralaje y carga diferida de afiches --- */
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const reduced = prefersReducedMotion();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const h = wall.clientHeight || 1;
        const i = Math.round(wall.scrollTop / h);
        setActive(i);
        setLoaded((prev) => (prev.has(i) && prev.has(i + 1) ? prev : new Set([...prev, i, i + 1])));
        if (!reduced) {
          wall.querySelectorAll<HTMLElement>(".cw-slide").forEach((slide, k) => {
            const off = (wall.scrollTop - k * h) / h;
            if (Math.abs(off) > 1.2) return;
            slide.style.setProperty("--par", `${off * 60}px`);
          });
        }
        if (wall.scrollTop > 40) {
          setDemo((on) => {
            if (on) storageSet("local", SWIPED_KEY, "1");
            return false;
          });
        }
      });
    };
    wall.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      wall.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [totalSlides]);

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    const wall = wallRef.current;
    if (!wall) return;
    wall.scrollTo({ top: i * wall.clientHeight, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }, []);

  /* --- enlace directo a un evento (?e=slug) --- */
  useEffect(() => {
    if (focusIndex > 0) requestAnimationFrame(() => scrollToIndex(focusIndex, false));
  }, [focusIndex, scrollToIndex]);

  /* --- gesto de introducción: solo hasta el primer deslizamiento --- */
  useEffect(() => {
    if (shown < 2 || prefersReducedMotion() || storageGet("local", SWIPED_KEY) === "1") return;
    const start = window.setTimeout(() => {
      if ((wallRef.current?.scrollTop ?? 0) > 10) return;
      setDemo(true);
      setTease(true);
      window.setTimeout(() => setTease(false), 1200);
      window.setTimeout(() => {
        setDemo((on) => {
          if (on) storageSet("local", SWIPED_KEY, "1");
          return false;
        });
      }, 6500);
    }, 1400);
    return () => window.clearTimeout(start);
  }, [shown]);

  /* --- reacciones --- */
  const burst = useCallback((btn: HTMLElement, emoji: string) => {
    if (prefersReducedMotion()) return;
    const r = btn.getBoundingClientRect();
    const base = Date.now();
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: base + i,
      emoji,
      x: r.left + r.width / 2 - 13,
      y: r.top,
      dx: Math.random() * 120 - 100,
      r: Math.random() * 60 - 30,
      delay: i * 60,
    }));
    setBursts((prev) => [...prev, ...items]);
    window.setTimeout(() => setBursts((prev) => prev.filter((b) => !items.some((x) => x.id === b.id))), 1600);
  }, []);

  const applyReaction = useCallback(
    async (ev: WallEvent, key: ReactionKey, btn: HTMLElement | null) => {
      const had = (mine[ev.id] ?? []).includes(key);
      const on = !had;
      // Optimista: se ve al tiro; si la base dice que no, se revierte.
      setMine((m) => ({ ...m, [ev.id]: on ? [...(m[ev.id] ?? []), key] : (m[ev.id] ?? []).filter((k) => k !== key) }));
      setCounts((c) => ({ ...c, [ev.id]: { ...c[ev.id], [key]: Math.max(0, (c[ev.id]?.[key] ?? 0) + (on ? 1 : -1)) } }));
      if (on) {
        setCelebrating(ev.id);
        window.setTimeout(() => setCelebrating((id) => (id === ev.id ? null : id)), 1800);
        if (btn) burst(btn, REACTIONS.find((r) => r.key === key)!.emoji);
        try {
          navigator.vibrate?.(12);
        } catch {
          // iPhone no tiene vibración web.
        }
      }
      const res = await setReaction(ev.id, key, on).catch(() => ({ ok: false as const, reason: "error" as const }));
      if (!res.ok) {
        setMine((m) => ({ ...m, [ev.id]: had ? [...(m[ev.id] ?? []), key] : (m[ev.id] ?? []).filter((k) => k !== key) }));
        setCounts((c) => ({ ...c, [ev.id]: { ...c[ev.id], [key]: Math.max(0, (c[ev.id]?.[key] ?? 0) + (on ? -1 : 1)) } }));
        showToast(res.reason === "login" ? "Entra con Google para reaccionar" : "No se pudo guardar. Inténtalo de nuevo.");
      }
    },
    [mine, burst, showToast],
  );

  async function onReact(ev: WallEvent, key: ReactionKey, btn: HTMLElement) {
    if (!isLoggedIn) {
      // Se pide Google al primer toque; la reacción queda pendiente y se aplica al volver.
      storageSet("session", PENDING_KEY, JSON.stringify({ id: ev.id, key }));
      showToast("Entra con Google para reaccionar");
      const err = await startGoogle(`/eventos?e=${encodeURIComponent(ev.slug)}`);
      if (err) {
        storageSet("session", PENDING_KEY, null);
        showToast(err);
      }
      return;
    }
    void applyReaction(ev, key, btn);
  }

  // Reacción pendiente de antes de entrar con Google.
  useEffect(() => {
    if (!isLoggedIn) return;
    const raw = storageGet("session", PENDING_KEY);
    if (!raw) return;
    storageSet("session", PENDING_KEY, null);
    let pending: { id: string; key: ReactionKey } | null = null;
    try {
      pending = JSON.parse(raw) as { id: string; key: ReactionKey };
    } catch {
      return; // Dato viejo o roto: se ignora.
    }
    const ev = events.find((e) => e.id === pending.id);
    if (!ev || !REACTIONS.some((r) => r.key === pending.key) || (mine[ev.id] ?? []).includes(pending.key)) return;
    const timer = window.setTimeout(() => void applyReaction(ev, pending.key, null), 0);
    return () => window.clearTimeout(timer);
    // Solo al cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- compartir --- */
  async function onShare(ev: WallEvent) {
    const url = new URL(`/${ev.slug}`, window.location.origin);
    if (refCode) url.searchParams.set("ref", refCode);
    const data = { title: ev.title, text: `${ev.title} · ${formatChileDate(ev.eventDate)}`, url: url.toString() };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(data);
      } catch {
        // La persona cerró el menú de compartir.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(data.url);
      showToast("Enlace copiado para compartir");
    } catch {
      showToast(data.url);
    }
  }

  /* --- compra --- */
  function openBuy(ev: WallEvent) {
    setBuying(ev);
    requestAnimationFrame(() => sheetRef.current?.showModal());
  }

  /* --- filtros y calendario --- */
  function chooseFilter(f: CarteleraFilter) {
    setFilter(f);
    // Se llama solo desde un toque (manejador de evento), no durante el render.
    // eslint-disable-next-line react-hooks/purity
    setFilterNow(Date.now());
    setActive(0);
    wallRef.current?.scrollTo({ top: 0 });
  }

  const days = useMemo(() => calendarDays(events.map((e) => e.eventDate), serverNow), [events, serverNow]);
  const dayEvents = events.filter((e) => chileDay(Date.parse(e.eventDate)) === selDay);

  function openCalendar() {
    const firstWithEvent = days.find((d) => d.hasEvent)?.day;
    if (firstWithEvent && !days.some((d) => d.day === selDay && d.hasEvent)) setSelDay(firstWithEvent);
    setCalOpen(true);
  }

  function goToEvent(id: string) {
    setCalOpen(false);
    setFilter("todo");
    const i = events.findIndex((e) => e.id === id);
    setLoaded((prev) => new Set([...prev, i, i + 1]));
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToIndex(i)));
  }

  const dayFmt = (day: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", ...opts }).format(new Date(`${day}T12:00:00Z`)).replace(".", "");

  return (
    <main className="cw-app">
      <div className="cw-top">
        <Link href="/" className="cw-logo cw-glass" aria-label="ANC Tickets, inicio">
          ANC
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link href="/mis-entradas" className="cw-pill cw-glass">
              Mis entradas
            </Link>
          ) : null}
          <button type="button" className="cw-pill cw-glass" onClick={openCalendar} aria-haspopup="dialog">
            <span aria-hidden="true">📅</span> Calendario
          </button>
        </div>
      </div>

      <div className="cw-filters" role="toolbar" aria-label="Filtrar por fecha">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="cw-chip" data-on={filter === f ? "" : undefined} aria-pressed={filter === f} onClick={() => chooseFilter(f)}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {totalSlides > 1 ? (
        <div className="cw-dots" aria-hidden="true">
          {Array.from({ length: totalSlides }, (_, i) => (
            <i key={i} data-on={i === active ? "" : undefined} />
          ))}
        </div>
      ) : null}

      {demo ? (
        <div className="cw-demo" aria-hidden="true">
          <div className="cw-demo-say">Desliza hacia arriba</div>
          <div className="cw-demo-trail" />
          <div className="cw-demo-hand">👆</div>
        </div>
      ) : null}

      <div ref={wallRef} className="cw-wall">
        {shown === 0 ? (
          <section className="cw-slide cw-empty">
            <div>
              <Tico pose="idle" width={170} className="mx-auto" />
              <p className="font-display mt-3 text-4xl uppercase">Nada por ahora</p>
              <p className="mt-2 text-sm text-[var(--cw-mut)]">
                {filter === "todo" ? "Tico está atento: cuando se publique un evento, aparece aquí." : "Prueba con “Todo” o mira el calendario."}
              </p>
              {filter !== "todo" ? (
                <button type="button" className="cw-pill cw-glass mt-5" onClick={() => chooseFilter("todo")}>
                  Ver todo
                </button>
              ) : (
                <p className="mt-6 text-sm text-[var(--cw-mut)]">
                  ¿Produces eventos? <ProducerLink />
                </p>
              )}
            </div>
          </section>
        ) : null}

        {list.map((ev, i) => {
          const badges = eventBadges(ev.tiers, serverNow);
          const cta = ctaFor(ev, serverNow);
          const isLast = i === totalSlides - 1;
          const nextTitle = i + 1 < shown ? list[i + 1].title : withComingSoon ? "Próximamente" : null;
          const near = loaded.has(i);
          const tico = ticoSay(ev.eventDate, ev.tiers, serverNow);
          const artStyle = { "--from": ev.theme.from, "--to": ev.theme.to } as CSSProperties;
          return (
            <section key={ev.id} className="cw-slide" aria-label={ev.title}>
              <div className="cw-art" style={artStyle}>
                {ev.imageUrl && near ? (
                  <Image
                    src={ev.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 460px) 100vw, 460px"
                    className="object-cover"
                    priority={i === 0}
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="cw-shade" aria-hidden="true" />

              <div className="cw-tico">
                <Tico pose={celebrating === ev.id ? "celebra" : tico.pose} width={78} motion={celebrating === ev.id ? "pop" : "bob"} />
                <p className="cw-tico-say cw-glass">{tico.text}</p>
              </div>

              <div className="cw-react" aria-label="Reacciones">
                {REACTIONS.map((r) => {
                  const on = (mine[ev.id] ?? []).includes(r.key);
                  const n = counts[ev.id]?.[r.key] ?? 0;
                  const label = reactionCountLabel(n);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      className="cw-rb cw-glass"
                      data-on={on ? "" : undefined}
                      aria-pressed={on}
                      aria-label={`${r.label}${label ? `, ${label}` : ""}`}
                      onClick={(e) => onReact(ev, r.key, e.currentTarget)}
                    >
                      <span className="cw-rb-e" aria-hidden="true">{r.emoji}</span>
                      <span className="cw-rb-n" aria-hidden="true">{label ?? ""}</span>
                    </button>
                  );
                })}
              </div>

              <div className="cw-info" data-tease={i === 0 && tease ? "" : undefined}>
                {badges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <span key={b.text} className="cw-tag" data-tone={b.tone}>
                        {b.tone === "hot" ? "🔥 " : ""}
                        {b.text}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h2 className="cw-title font-display">{ev.title}</h2>
                <p className="cw-when">
                  {formatChileDate(ev.eventDate)}
                  {ev.venue ? ` · ${ev.venue}` : ""}
                </p>
                <Countdown target={Date.parse(ev.eventDate)} serverNow={serverNow} live={Math.abs(i - active) <= 1} />
              </div>

              <button
                type="button"
                className="cw-next"
                onClick={() => scrollToIndex(isLast ? 0 : i + 1)}
                aria-label={isLast ? "Volver arriba" : `Siguiente: ${nextTitle}`}
              >
                <span className="cw-nx cw-glass">
                  {isLast ? (
                    <>
                      Eso es todo por ahora ·{"\u00a0"}<b>Volver arriba ↑</b>
                    </>
                  ) : (
                    <>
                      <span className="cw-chev" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      Siguiente ·{"\u00a0"}<b>{nextTitle}</b>
                    </>
                  )}
                </span>
              </button>

              <div className="cw-cta">
                {cta.action === "buy" ? (
                  <button type="button" className="cw-btn" onClick={() => openBuy(ev)}>
                    {cta.label}
                  </button>
                ) : cta.action === "page" ? (
                  <Link href={`/${ev.slug}`} className="cw-btn">
                    {cta.label}
                  </Link>
                ) : (
                  <button type="button" className="cw-btn" disabled>
                    {cta.label}
                  </button>
                )}
                <button type="button" className="cw-sq cw-glass" aria-label={`Compartir ${ev.title}`} onClick={() => onShare(ev)}>
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </section>
          );
        })}

        {withComingSoon ? (
          <section className="cw-slide cw-empty" aria-label="Próximamente">
            <div>
              <Tico pose="saluda" width={190} className="mx-auto" />
              <p className="font-display mt-3 text-5xl uppercase">Próximamente</p>
              <p className="mt-2 text-sm text-[var(--cw-mut)]">Más fechas en camino. Vuelve pronto.</p>
              <p className="mt-6 text-sm text-[var(--cw-mut)]">
                ¿Produces eventos? <ProducerLink />
              </p>
            </div>
            <button type="button" className="cw-next" onClick={() => scrollToIndex(0)} aria-label="Volver arriba">
              <span className="cw-nx cw-glass">
                Eso es todo por ahora ·{"\u00a0"}<b>Volver arriba ↑</b>
              </span>
            </button>
          </section>
        ) : null}
      </div>

      {/* ---------- Calendario ---------- */}
      <div className="cw-timeline" data-open={calOpen ? "" : undefined} role="dialog" aria-modal="true" aria-label="Calendario" hidden={!calOpen}>
        <div className="flex items-center justify-between">
          <span className="font-display text-3xl uppercase">Calendario</span>
          <button type="button" className="cw-pill cw-glass" onClick={() => setCalOpen(false)}>
            ✕ Cerrar
          </button>
        </div>
        <div className="cw-cal">
          {days.map((d) => (
            <button
              key={d.day}
              type="button"
              className="cw-day"
              data-has={d.hasEvent ? "" : undefined}
              data-sel={d.day === selDay ? "" : undefined}
              aria-pressed={d.day === selDay}
              aria-label={`${dayFmt(d.day, { weekday: "long", day: "numeric", month: "long" })}${d.hasEvent ? ", con eventos" : ""}`}
              onClick={() => setSelDay(d.day)}
            >
              <small>{dayFmt(d.day, { weekday: "short" }).toUpperCase()}</small>
              <b>{dayFmt(d.day, { day: "numeric" })}</b>
              <i />
            </button>
          ))}
        </div>
        <p className="cw-sec">{dayFmt(selDay, { weekday: "long", day: "numeric", month: "long" })}</p>
        {dayEvents.length > 0 ? (
          dayEvents.map((ev) => {
            const badge = eventBadges(ev.tiers, serverNow)[0];
            return (
              <button key={ev.id} type="button" className="cw-card" onClick={() => goToEvent(ev.id)}>
                <div className="cw-card-th" style={{ "--from": ev.theme.from, "--to": ev.theme.to } as CSSProperties}>
                  {ev.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage, carga diferida
                    <img src={ev.imageUrl} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </div>
                <div className="cw-card-tx">
                  <div>
                    <h3 className="font-display">{ev.title}</h3>
                    <p>
                      {formatChileDate(ev.eventDate).split(", ")[1]}
                      {ev.venue ? ` · ${ev.venue}` : ""}
                    </p>
                  </div>
                  {badge ? <span className="cw-badge">{badge.text}</span> : null}
                </div>
              </button>
            );
          })
        ) : (
          <p className="mt-3 text-sm text-[var(--cw-mut)]">No hay eventos este día. Los días con punto sí tienen.</p>
        )}
      </div>

      {/* ---------- Hoja de compra: mismo formulario y checkout que la página del evento ---------- */}
      <dialog
        ref={sheetRef}
        className="cw-sheet"
        aria-label={buying ? `Entradas para ${buying.title}` : "Entradas"}
        onClose={() => setBuying(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        {buying ? (
          <div className="cw-sheet-body">
            <span className="cw-grab" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-3xl uppercase leading-none">{buying.title}</p>
                <p className="mt-1.5 text-[13px] text-[var(--cw-mut)]">
                  {formatChileDate(buying.eventDate)}
                  {buying.venue ? ` · ${buying.venue}` : ""}
                </p>
              </div>
              <button type="button" className="cw-sq cw-glass shrink-0" aria-label="Cerrar" onClick={() => sheetRef.current?.close()}>
                ✕
              </button>
            </div>
            <div className="mt-4">
              <BuyForm
                eventId={buying.id}
                eventSlug={buying.slug}
                ticketTypes={buying.tiers}
                isLoggedIn={isLoggedIn}
                serverNow={serverNow}
                salesSuspended={buying.salesSuspended}
              />
            </div>
            <Link href={`/${buying.slug}`} className="mt-4 block text-center text-sm text-[var(--cw-mut)] underline underline-offset-4">
              Ver la página completa del evento
            </Link>
          </div>
        ) : null}
      </dialog>

      {bursts.map((b) => (
        <span
          key={b.id}
          className="cw-fly"
          aria-hidden="true"
          style={{ left: b.x, top: b.y, animationDelay: `${b.delay}ms`, "--dx": `${b.dx}px`, "--r": `${b.r}deg` } as CSSProperties}
        >
          {b.emoji}
        </span>
      ))}

      <div className="cw-toast" data-show={toast ? "" : undefined} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}
