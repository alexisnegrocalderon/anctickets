"use client";

/**
 * ANC dashboard: wizard de creación de evento. La barra de pasos es tocable:
 * cualquier paso ya visitado se puede abrir para volver (y se conserva todo lo
 * escrito, porque el estado vive en este componente). Cada paso tiene su botón
 * Atrás. Apenas se completan título+fecha el evento queda guardado como
 * borrador: si el usuario abandona, retoma desde "Eventos" → editar.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createDraftEvent, updateEvent, createTicketType, setEventStatus } from "@/app/dashboard/events/actions";
import { Button, Field, Input, Textarea } from "@/components/dashboard/ui";
import ImageUpload from "@/components/dashboard/image-upload";
import { isValidHex } from "@/lib/color";
import { EVENT_THEME_OPTIONS, EVENT_THEME_STYLES, resolveEventTheme } from "@/lib/event-themes";
import { slugify } from "@/lib/slug";
import type { EventTheme } from "@/lib/database.types";

const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "tickets.ancdigital.cl";

type DraftTicketType = { name: string; base_price: number; quantity: number };

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
  const [ttName, setTtName] = useState("");
  const [ttPrice, setTtPrice] = useState("");
  const [ttQuantity, setTtQuantity] = useState("");

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

  async function persist() {
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
      } else {
        await updateEvent(eventId, buildFormData());
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      return false;
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

  async function handleAddTicketType() {
    if (!eventId || !ttName.trim() || !ttPrice || !ttQuantity) return;

    setSaving(true);
    setError(null);

    try {
      const data = new FormData();
      data.set("name", ttName);
      data.set("base_price", ttPrice);
      data.set("quantity", ttQuantity);
      await createTicketType(eventId, data);

      setTicketTypes((list) => [
        ...list,
        { name: ttName, base_price: Number(ttPrice), quantity: Number(ttQuantity) },
      ]);
      setTtName("");
      setTtPrice("");
      setTtQuantity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la entrada");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish(publish: boolean) {
    if (!eventId) return;
    setSaving(true);
    setError(null);

    try {
      if (publish) {
        const result = await setEventStatus(eventId, "published");
        if (result.error) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }
      router.push(`/dashboard/events/${eventId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar");
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
                            animate={prefersReducedMotion ? undefined : { scale: selected ? 1.04 : 1 }}
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
                        animate={prefersReducedMotion ? undefined : { scale: theme === "custom" ? 1.04 : 1 }}
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
                    Puedes saltar este paso y agregar tipos de entrada más tarde desde el evento.
                  </p>

                  {ticketTypes.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      <AnimatePresence initial={false}>
                        {ticketTypes.map((tt, index) => (
                          <motion.li
                            key={`${tt.name}-${index}`}
                            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                            className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
                          >
                            <span className="text-[#f5f4f1]">{tt.name}</span>
                            <span className="text-neutral-400">
                              ${tt.base_price.toLocaleString("es-CL", { maximumFractionDigits: 0 })} · cupo {tt.quantity}
                            </span>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      placeholder="Nombre (ej. General)"
                      value={ttName}
                      onChange={(e) => setTtName(e.target.value)}
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Precio base ($)"
                      value={ttPrice}
                      onChange={(e) => setTtPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Cupo"
                      value={ttQuantity}
                      onChange={(e) => setTtQuantity(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={saving || !ttName.trim() || !ttPrice || !ttQuantity}
                    onClick={handleAddTicketType}
                  >
                    + Agregar tipo de entrada
                  </Button>
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
                        ? `${ticketTypes.length} tipo(s) de entrada cargados`
                        : "Sin tipos de entrada todavía"}
                    </p>
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
                      disabled={saving || blockingIssues.length > 0}
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
                      Para publicar resuelve lo que falta. Mientras tanto puedes guardar el borrador.
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
