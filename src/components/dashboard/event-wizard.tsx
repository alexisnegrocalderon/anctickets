"use client";

/**
 * ANC dashboard: wizard de creación de evento. La barra de pasos es tocable:
 * cualquier paso ya visitado se puede abrir para volver (y se conserva todo lo
 * escrito, porque el estado vive en este componente). Cada paso tiene su botón
 * Atrás. Apenas se completan título+fecha el evento queda guardado como
 * borrador: si el usuario abandona, retoma desde "Eventos" → editar.
 */
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createDraftEvent,
  updateEvent,
  createTicketType,
  updateTicketTypeForm,
  deleteTicketTypeForm,
  setEventStatus,
} from "@/app/dashboard/events/actions";
import { Button, Field, Input, Textarea } from "@/components/dashboard/ui";
import ImageUpload from "@/components/dashboard/image-upload";
import TierFields, { EMPTY_TIER_DRAFT, tierDraftError, type TierDraft } from "@/components/dashboard/tier-fields";
import { isoToChileInput, chileLocalToIso } from "@/lib/datetime";
import { tierDatesSummary } from "@/lib/tiers";
import { isValidHex } from "@/lib/color";
import { EVENT_THEME_OPTIONS, EVENT_THEME_STYLES, resolveEventTheme } from "@/lib/event-themes";
import { slugify } from "@/lib/slug";
import type { EventTheme } from "@/lib/database.types";

const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "tickets.ancdigital.cl";

/** Una tanda ya guardada en la base como parte del borrador (id real). */
type DraftTicketType = {
  id: string;
  name: string;
  base_price: number;
  quantity: number;
  sales_start: string | null;
  sales_end: string | null;
};

const clp = (n: number) => `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;

function tierToDraft(tt: DraftTicketType): TierDraft {
  return {
    name: tt.name,
    price: String(tt.base_price),
    quantity: String(tt.quantity),
    start: isoToChileInput(tt.sales_start),
    end: isoToChileInput(tt.sales_end),
    paused: false,
  };
}

/** Tarjeta de una tanda del borrador, con Editar y Quitar (con confirmación breve). */
function TierSummary({
  tier,
  editing,
  confirming,
  busy,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  tier: DraftTicketType;
  editing: boolean;
  confirming: boolean;
  busy: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`rounded-2xl border p-4 ${
        editing ? "border-[var(--anc-vermilion)]/60 bg-[var(--anc-vermilion)]/[.06]" : "border-white/10 bg-white/[.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-base font-semibold text-[#f5f4f1]">{tier.name}</p>
        <p className="shrink-0 text-sm text-neutral-300">{tier.base_price === 0 ? "Gratis" : clp(tier.base_price)}</p>
      </div>
      <p className="mt-0.5 text-sm text-neutral-400">Cupo {tier.quantity}</p>
      <p className="mt-1 text-sm text-neutral-300">{tierDatesSummary(tier)}</p>
      {editing ? (
        <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[.14em] text-[var(--anc-vermilion)]">
          Editando abajo
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        {confirming ? (
          <>
            <span className="mr-auto text-sm text-neutral-200">¿Quitar esta tanda?</span>
            <Button variant="danger" disabled={busy} onClick={onRemove}>
              Sí, quitar
            </Button>
            <Button variant="outline" disabled={busy} onClick={onCancelRemove}>
              No
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" disabled={busy} onClick={onEdit} aria-label={`Editar ${tier.name}`}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5Z" strokeLinejoin="round" />
              </svg>
              Editar
            </Button>
            <Button variant="danger" disabled={busy} onClick={onAskRemove} aria-label={`Quitar ${tier.name}`}>
              Quitar
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

const STEP_LABELS = [
  "Marca",
  "Título",
  "Fecha y lugar",
  "Descripción",
  "Imagen",
  "Entradas",
  "Revisión",
] as const;

const TOTAL_STEPS = STEP_LABELS.length;

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -48 : 48, opacity: 0 }),
};

function LivePreview({
  theme,
  accentColor,
  organizerLogoUrl,
  title,
  eventDate,
  venue,
  imageUrl,
}: {
  theme: EventTheme;
  accentColor: string | null;
  organizerLogoUrl: string;
  title: string;
  eventDate: string;
  venue: string;
  imageUrl: string;
}) {
  const style = resolveEventTheme(theme, accentColor);
  const date = eventDate ? new Date(eventDate) : null;

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-500">
        Así se ve tu página, en vivo
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_20px_50px_-20px_rgba(0,0,0,.7)]">
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-neutral-900">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="text-xs font-semibold text-neutral-600"
              style={{ backgroundImage: `radial-gradient(circle at 50% 30%, ${style.from}22, transparent 70%)` }}
            >
              Sin imagen todavía
            </span>
          )}
        </div>
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ backgroundImage: `linear-gradient(to right, ${style.from}, ${style.to})` }}
        >
          {organizerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizerLogoUrl} alt="" className="h-5 max-w-[40%] object-contain" />
          ) : (
            <span className="text-xs font-black italic tracking-tight" style={{ color: style.ink }}>
              Tu marca
            </span>
          )}
        </div>
        <div className="p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: style.text }}>
            {venue || "Tu recinto"}
          </p>
          <p className="mt-1 text-xl font-black leading-tight text-[#f5f4f1]">
            {title || "Nombre de tu fiesta"}
          </p>
          <p className="mt-3 font-mono text-xs text-neutral-500">
            {date
              ? date.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : "Fecha por definir"}
          </p>
          <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">
            Powered by ANC Tickets
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EventWizard({ mpConnected = true }: { mpConnected?: boolean }) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<EventTheme>("magenta");
  const [accentColor, setAccentColor] = useState("#FF206E");
  const [organizerLogoUrl, setOrganizerLogoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [ticketTypes, setTicketTypes] = useState<DraftTicketType[]>([]);
  const [tierDraft, setTierDraft] = useState<TierDraft>(EMPTY_TIER_DRAFT);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const tierFormRef = useRef<HTMLDivElement>(null);

  function buildFormData() {
    const data = new FormData();
    data.set("title", title);
    data.set("event_date", eventDate);
    data.set("venue", venue);
    data.set("description", description);
    data.set("image_url", imageUrl);
    data.set("theme", theme);
    data.set("accent_color", theme === "custom" && isValidHex(accentColor) ? accentColor : "");
    data.set("organizer_logo_url", organizerLogoUrl);
    data.set("slug", customSlug);
    return data;
  }

  /** En producción Next oculta los errores lanzados por el servidor (ej. "#441"); no se los mostramos al usuario. */
  function readableError(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : "";
    if (!message || /^An error occurred|#\d+|digest|Server Components render/i.test(message)) return fallback;
    return message;
  }

  async function persist(): Promise<string | null> {
    setSaving(true);
    setError(null);

    try {
      if (!eventId) {
        const created = await createDraftEvent(buildFormData());
        setEventId(created.id);
        // El slug real puede llevar un sufijo si hubo colisión (ej. "-2"); si
        // se reenviara el texto original en el próximo guardado, chocaría con
        // el evento ajeno que causó la colisión. Se sincroniza al resultado.
        setCustomSlug(created.slug);
        return created.id;
      } else {
        await updateEvent(eventId, buildFormData());
      }
      return eventId;
    } catch (err) {
      setError(readableError(err, "No se pudo guardar el borrador. Revisa tu conexión e inténtalo de nuevo."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  const persistable = title.trim().length > 0 && eventDate.length > 0;

  /** Cambia de paso guardando el borrador cuando corresponde. No borra nada. */
  async function go(target: number) {
    if (saving || target === step || target < 0 || target >= TOTAL_STEPS) return;
    const forward = target > step;

    if (forward && step === 1 && title.trim().length === 0) {
      setError("Escribe el título de tu evento para seguir.");
      return;
    }
    if (forward && step === 2 && eventDate.length === 0) {
      setError("Elige la fecha y hora de tu evento para seguir.");
      return;
    }

    // Desde el paso 2 en adelante hay título+fecha: se crea o actualiza el borrador.
    if (step >= 2 && persistable && (eventId !== null || forward)) {
      const ok = await persist();
      if (!ok) return;
    }

    setError(null);
    setDirection(forward ? 1 : -1);
    setStep(target);
    setMaxStep((value) => Math.max(value, target));
  }

  function goNext() {
    return go(step + 1);
  }

  function goBack() {
    return go(step - 1);
  }

  /** Solo los pasos ya visitados son tocables en la barra. */
  function goToVisited(target: number) {
    if (target > maxStep) return;
    return go(target);
  }

  function resetTierForm() {
    setTierDraft(EMPTY_TIER_DRAFT);
    setEditingTierId(null);
  }

  function startEditTier(tier: DraftTicketType) {
    setConfirmRemoveId(null);
    setEditingTierId(tier.id);
    setTierDraft(tierToDraft(tier));
    setError(null);
    // Lleva la vista al formulario (sin animación si el usuario prefiere menos movimiento).
    requestAnimationFrame(() =>
      tierFormRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion ? "auto" : "smooth" })
    );
  }

  function tierFormData() {
    const data = new FormData();
    data.set("name", tierDraft.name);
    data.set("base_price", tierDraft.price);
    data.set("quantity", tierDraft.quantity);
    data.set("sales_start", tierDraft.start);
    data.set("sales_end", tierDraft.end);
    return data;
  }

  const tierDraftIncomplete = !tierDraft.name.trim() || tierDraft.price === "" || tierDraft.quantity === "";
  const tierDateError = tierDraftError(tierDraft, eventDate);

  /** Agrega la tanda o, si se está editando una, guarda los cambios (también en la base). */
  async function handleSubmitTier() {
    if (!eventId || tierDraftIncomplete || tierDateError) {
      if (!eventId) setError("Primero guarda el título y la fecha del evento para poder agregar entradas.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = tierFormData();
      const salesStart = tierDraft.start ? chileLocalToIso(tierDraft.start) : null;
      const salesEnd = tierDraft.end ? chileLocalToIso(tierDraft.end) : null;
      const fields = {
        name: tierDraft.name.trim(),
        base_price: Number(tierDraft.price),
        quantity: Number(tierDraft.quantity),
        sales_start: salesStart,
        sales_end: salesEnd,
      };

      if (editingTierId) {
        const result = await updateTicketTypeForm(eventId, editingTierId, null, data);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setTicketTypes((list) => list.map((tt) => (tt.id === editingTierId ? { ...tt, ...fields } : tt)));
      } else {
        const created = await createTicketType(eventId, data);
        setTicketTypes((list) => [...list, { id: created.id, ...fields }]);
      }
      resetTierForm();
    } catch (err) {
      setError(readableError(err, "No se pudo guardar la tanda. Revisa los datos e inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveTier(tier: DraftTicketType) {
    if (!eventId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteTicketTypeForm(eventId, tier.id, null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTicketTypes((list) => list.filter((tt) => tt.id !== tier.id));
      if (editingTierId === tier.id) resetTierForm();
      setConfirmRemoveId(null);
    } catch (err) {
      setError(readableError(err, "No se pudo quitar la tanda. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish(publish: boolean) {
    if (saving) return;

    if (publish && !persistable) {
      // Sin título o fecha no hay borrador que publicar: decimos qué falta.
      setError(`No se puede publicar todavía. ${blockingIssues.map((issue) => issue.text).join(" ")}`);
      return;
    }

    let id = eventId;
    if (!id) {
      if (!persistable) {
        setError("Para guardar el borrador escribe al menos el título y elige la fecha del evento.");
        return;
      }
      id = await persist();
      if (!id) return;
    }

    setSaving(true);
    setError(null);

    try {
      if (publish) {
        const result = await setEventStatus(id, "published");
        if (result.error) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }
      router.push(`/dashboard/events/${id}/edit`);
    } catch (err) {
      setError(readableError(err, "No se pudo publicar. Tu borrador quedó guardado; revisa lo que falta e inténtalo de nuevo."));
      setSaving(false);
    }
  }

  type ReviewIssue = {
    id: string;
    text: string;
    blocking: boolean;
    label: string;
    step?: number;
    href?: string;
  };
  const hasPaidTicket = ticketTypes.some((tt) => tt.base_price > 0);
  const reviewIssues: ReviewIssue[] = [
    ...(title.trim().length === 0
      ? [{ id: "title", blocking: true, step: 1, label: "Poner título", text: "Tu evento no tiene título." }]
      : []),
    ...(eventDate.length === 0
      ? [{ id: "date", blocking: true, step: 2, label: "Elegir fecha", text: "Falta la fecha y hora del evento." }]
      : []),
    ...(ticketTypes.length === 0
      ? [
          {
            id: "tickets",
            blocking: true,
            step: 5,
            label: "Agregar entrada",
            text: "Aún no tienes ningún tipo de entrada. Sin al menos una, nadie puede comprar y no podemos publicar el evento.",
          },
        ]
      : []),
    ...(hasPaidTicket && !mpConnected
      ? [
          {
            id: "mp",
            blocking: true,
            href: "/dashboard/mercadopago/connect",
            label: "Conectar Mercado Pago",
            text: "Tienes entradas de pago y tu cuenta de Mercado Pago no está conectada. Tu borrador queda guardado.",
          },
        ]
      : []),
    ...(!imageUrl
      ? [
          {
            id: "image",
            blocking: false,
            step: 4,
            label: "Subir imagen",
            text: "Sin imagen, tu página se verá con un degradado. Es opcional, pero vende más con flyer.",
          },
        ]
      : []),
  ];
  const blockingIssues = reviewIssues.filter((issue) => issue.blocking);
  const canAdvanceStep1 = title.trim().length > 0;
  const canAdvanceStep2 = eventDate.length > 0;
  const stepTransition = prefersReducedMotion ? { duration: 0 } : SPRING;

  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="Pasos para crear tu evento" className="mb-3">
        <ol className="flex items-stretch gap-1.5">
          {STEP_LABELS.map((label, index) => {
            const visited = index <= maxStep;
            const current = index === step;
            return (
              <li key={label} className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!visited || saving}
                  onClick={() => goToVisited(index)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Paso ${index + 1}: ${label}${visited && !current ? " (volver)" : ""}`}
                  className="group flex min-h-11 w-full flex-col justify-center gap-1.5 text-left disabled:cursor-default"
                >
                  <span className="h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ backgroundColor: current ? "var(--anc-vermilion)" : "rgba(255,255,255,.55)", transformOrigin: "left" }}
                      initial={false}
                      animate={{ scaleX: visited ? 1 : 0 }}
                      transition={stepTransition}
                    />
                  </span>
                  <span
                    className={`hidden truncate text-[10px] font-semibold uppercase tracking-wide transition-colors sm:block ${
                      current ? "text-white" : visited ? "text-neutral-300 group-hover:text-white" : "text-neutral-600"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="mb-6 font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[var(--anc-muted-text)]">
        Paso {step + 1} de {TOTAL_STEPS} · {STEP_LABELS[step]}
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={prefersReducedMotion ? undefined : slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
            >
              {step === 0 ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">¿Cuál es el mood de tu fiesta?</h1>
                    <p className="text-sm text-neutral-400">
                      Define el color de tu página pública, o usa el tuyo propio si ya tienes una marca.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {EVENT_THEME_OPTIONS.map((option) => {
                        const style = EVENT_THEME_STYLES[option.value];
                        const selected = theme === option.value;
                        return (
                          <motion.button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                            animate={prefersReducedMotion ? undefined : { scale: selected ? 1.02 : 1 }}
                            transition={{ type: "spring", stiffness: 320, damping: 20 }}
                            className="relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl p-4 text-left"
                            style={{
                              backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})`,
                              boxShadow: selected ? `0 0 0 3px ${style.from}, 0 0 26px ${style.from}66` : undefined,
                            }}
                          >
                            <span
                              className="font-mono text-[10px] font-bold uppercase tracking-[.16em]"
                              style={{ color: style.ink, opacity: 0.75 }}
                            >
                              {selected ? "Elegido ✓" : "Elegir"}
                            </span>
                            <span className="text-lg font-black leading-tight" style={{ color: style.ink }}>
                              {option.label}
                            </span>
                          </motion.button>
                        );
                      })}

                      {/* Quinta opción: color de marca propio en vez de uno de los 4 moods curados. */}
                      <motion.button
                        type="button"
                        onClick={() => setTheme("custom")}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                        animate={prefersReducedMotion ? undefined : { scale: theme === "custom" ? 1.02 : 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 20 }}
                        className="relative col-span-2 flex h-20 items-center justify-between overflow-hidden rounded-2xl border border-dashed border-white/20 p-4 text-left"
                        style={{
                          backgroundColor: isValidHex(accentColor) ? `${accentColor}22` : "transparent",
                          boxShadow: theme === "custom" ? `0 0 0 3px ${accentColor}, 0 0 26px ${accentColor}66` : undefined,
                        }}
                      >
                        <span className="text-lg font-black leading-tight text-[#f5f4f1]">
                          {theme === "custom" ? "Elegido ✓ Personalizado" : "Personalizado"}
                        </span>
                        <span
                          className="h-9 w-9 shrink-0 rounded-full border-2 border-white/30"
                          style={{ backgroundColor: isValidHex(accentColor) ? accentColor : "#FF206E" }}
                          aria-hidden="true"
                        />
                      </motion.button>
                    </div>

                    {theme === "custom" ? (
                      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
                        <input
                          type="color"
                          value={isValidHex(accentColor) ? accentColor : "#FF206E"}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                          aria-label="Elegir color de marca"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#FF206E"
                          className="max-w-[10rem] font-mono uppercase"
                        />
                        {!isValidHex(accentColor) ? (
                          <p className="text-xs text-red-400">Escribe un hex válido (ej. #FF206E)</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
                    <div>
                      <h2 className="text-2xl uppercase text-white">Tu logo (opcional)</h2>
                      <p className="text-sm text-neutral-400">
                        Si lo subes, tu página lo muestra en vez del logo de ANC — es tu marca, tu evento.
                      </p>
                    </div>
                    <ImageUpload variant="logo" defaultValue={organizerLogoUrl} onChange={setOrganizerLogoUrl} />
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    ¿Cómo se llama tu evento?
                  </h1>
                  <Field label="Título del evento">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Fiesta ANC Verano"
                      autoFocus
                    />
                  </Field>
                  <Field label="Link de tu evento (opcional)">
                    <div className="flex items-center overflow-hidden rounded-xl border border-white/15 focus-within:border-[var(--anc-accent)]">
                      <span className="whitespace-nowrap bg-white/5 px-3 py-2 text-sm text-neutral-500">
                        {SITE_HOST}/
                      </span>
                      <input
                        value={customSlug}
                        onChange={(e) => setCustomSlug(slugify(e.target.value))}
                        placeholder={slugify(title) || "mi-fiesta"}
                        className="min-h-11 w-full bg-transparent px-2 py-2 text-base text-white outline-none sm:text-sm"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Déjalo vacío y usamos el título. Corto y fácil de decir en tu historia.
                    </p>
                  </Field>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    ¿Cuándo y dónde es?
                  </h1>
                  <Field label="Fecha y hora">
                    <Input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Lugar (opcional)">
                    <Input
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Recinto, dirección"
                    />
                  </Field>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    Cuéntale a tu público de qué se trata
                  </h1>
                  <p className="text-sm text-neutral-400">Puedes saltar este paso y agregarlo después.</p>
                  <Field label="Descripción (opcional)">
                    <Textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    Súbele una imagen
                  </h1>
                  <p className="text-sm text-neutral-400">Puedes saltar este paso y agregarlo después.</p>
                  <ImageUpload defaultValue={imageUrl} onChange={setImageUrl} />
                </div>
              ) : null}

              {step === 5 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    ¿Qué entradas vas a vender?
                  </h1>
                  <p className="text-sm text-neutral-400">
                    Cada tanda tiene su precio, cupo y, si quieres, fechas de apertura y cierre. Puedes saltar este paso y agregarlas más tarde desde el evento.
                  </p>

                  {ticketTypes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <h2 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-neutral-400">
                        Tandas agregadas ({ticketTypes.length})
                      </h2>
                      <ul className="flex flex-col gap-3">
                        {ticketTypes.map((tt) => (
                          <TierSummary
                            key={tt.id}
                            tier={tt}
                            editing={editingTierId === tt.id}
                            confirming={confirmRemoveId === tt.id}
                            busy={saving}
                            onEdit={() => startEditTier(tt)}
                            onAskRemove={() => setConfirmRemoveId(tt.id)}
                            onCancelRemove={() => setConfirmRemoveId(null)}
                            onRemove={() => handleRemoveTier(tt)}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div ref={tierFormRef} className="scroll-mt-4 rounded-2xl border border-white/10 p-4">
                    <h2 className="mb-4 text-xl uppercase text-white">
                      {editingTierId ? "Editar tanda" : ticketTypes.length > 0 ? "Agregar otra tanda" : "Tu primera tanda"}
                    </h2>
                    <TierFields
                      idPrefix="wizard-tier"
                      value={tierDraft}
                      onChange={setTierDraft}
                      eventDateLocal={eventDate}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={editingTierId ? "primary" : "outline"}
                        disabled={saving || tierDraftIncomplete || !!tierDateError}
                        onClick={handleSubmitTier}
                      >
                        {saving ? "Guardando…" : editingTierId ? "Guardar cambios" : "+ Agregar tanda"}
                      </Button>
                      {editingTierId ? (
                        <Button type="button" variant="outline" disabled={saving} onClick={resetTierForm}>
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-[clamp(1.9rem,7vw,2.6rem)] uppercase leading-[1] text-white">
                    Revisión final
                  </h1>
                  <div className="rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-5 text-sm text-neutral-300">
                    <p className="text-base font-semibold text-white">{title || "Sin título"}</p>
                    <p className="mt-1 text-[var(--anc-muted-text)]">
                      {eventDate ? new Date(eventDate).toLocaleString("es-CL") : "Sin fecha"}
                      {venue ? ` · ${venue}` : ""}
                    </p>
                    <p className="mt-3 text-[var(--anc-muted-text)]">
                      {ticketTypes.length > 0
                        ? `${ticketTypes.length} ${ticketTypes.length === 1 ? "tanda cargada" : "tandas cargadas"}`
                        : "Sin tandas de entrada todavía"}
                    </p>
                    {ticketTypes.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2">
                        {ticketTypes.map((tt) => (
                          <li key={tt.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{tt.name}</p>
                              <p className="text-neutral-400">
                                {tt.base_price === 0 ? "Gratis" : clp(tt.base_price)} · cupo {tt.quantity}
                              </p>
                              <p className="text-neutral-300">{tierDatesSummary(tt)}</p>
                            </div>
                            <Button
                              variant="outline"
                              disabled={saving}
                              aria-label={`Editar ${tt.name}`}
                              onClick={async () => {
                                await go(5);
                                startEditTier(tt);
                              }}
                            >
                              Editar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {reviewIssues.length > 0 ? (
                    <ul className="flex flex-col gap-2" aria-label="Pendientes antes de publicar">
                      {reviewIssues.map((issue) => (
                        <li
                          key={issue.id}
                          className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                            issue.blocking
                              ? "border-[var(--anc-vermilion)]/50 bg-[var(--anc-vermilion)]/10"
                              : "border-white/10 bg-white/[.03]"
                          }`}
                        >
                          <p className="text-sm text-neutral-100">
                            <span className="mr-1.5 font-mono text-[11px] font-bold uppercase tracking-[.14em] text-[var(--anc-vermilion)]">
                              {issue.blocking ? "Falta" : "Sugerencia"}
                            </span>
                            {issue.text}
                          </p>
                          {issue.href ? (
                            <Link
                              href={issue.href}
                              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--anc-vermilion)] px-5 text-sm font-semibold text-[var(--anc-ink)]"
                            >
                              {issue.label}
                            </Link>
                          ) : (
                            <Button
                              variant={issue.blocking ? "primary" : "outline"}
                              className="shrink-0"
                              disabled={saving}
                              onClick={() => go(issue.step!)}
                            >
                              {issue.label}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="primary"
                      disabled={saving}
                      onClick={() => handleFinish(true)}
                    >
                      Crear y publicar
                    </Button>
                    <Button variant="outline" disabled={saving} onClick={() => handleFinish(false)}>
                      Guardar como borrador
                    </Button>
                  </div>
                  {blockingIssues.length > 0 ? (
                    <p className="text-xs text-[var(--anc-muted-text)]">
                      Puedes pulsar publicar igual: te diremos qué falta. Mientras tanto puedes guardar el borrador.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
              {/Mercado Pago/.test(error) ? (
                <>
                  {" "}
                  <Link href="/dashboard/mercadopago/connect" className="font-semibold text-white underline underline-offset-4">
                    Conectar ahora
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step === 0 ? (
              <Link
                href="/dashboard/events"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
              >
                Atrás
              </Link>
            ) : (
              <Button variant="outline" disabled={saving} onClick={goBack}>
                Atrás
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <div className="flex gap-2">
                {step >= 3 ? (
                  <Button variant="outline" disabled={saving} onClick={goNext}>
                    Saltar
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  disabled={
                    saving ||
                    (step === 1 && !canAdvanceStep1) ||
                    (step === 2 && !canAdvanceStep2)
                  }
                  onClick={goNext}
                >
                  {saving ? "Guardando..." : "Siguiente"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <LivePreview
            theme={theme}
            accentColor={accentColor}
            organizerLogoUrl={organizerLogoUrl}
            title={title}
            eventDate={eventDate}
            venue={venue}
            imageUrl={imageUrl}
          />
        </div>
      </div>
    </div>
  );
}
