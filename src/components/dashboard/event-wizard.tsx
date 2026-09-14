"use client";

/**
 * ANC dashboard: wizard de creación de evento — secuencia de pasos saltables con
 * transiciones en spring, vista previa en vivo de la página del evento y un primer
 * paso de "mood" que define el color de la tarjeta pública. Apenas se completan
 * título+fecha el evento ya queda guardado como borrador: si el usuario abandona
 * el wizard, retoma desde "Mis eventos" → editar, sin perder nada.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createDraftEvent, updateEvent, createTicketType, setEventStatus } from "@/app/dashboard/events/actions";
import { Button, Field, Input, Textarea } from "@/components/dashboard/ui";
import ImageUpload from "@/components/dashboard/image-upload";
import { isValidHex } from "@/lib/color";
import { EVENT_THEME_OPTIONS, EVENT_THEME_STYLES, resolveEventTheme } from "@/lib/event-themes";
import type { EventTheme } from "@/lib/database.types";

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
              ANC<span className="opacity-70">TICKETS</span>
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
          {organizerLogoUrl ? (
            <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">
              Powered by ANC Tickets
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EventWizard() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<EventTheme>("magenta");
  const [accentColor, setAccentColor] = useState("#FF206E");
  const [organizerLogoUrl, setOrganizerLogoUrl] = useState("");
  const [title, setTitle] = useState("");
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
    return data;
  }

  async function persist() {
    setSaving(true);
    setError(null);

    try {
      if (!eventId) {
        const created = await createDraftEvent(buildFormData());
        setEventId(created.id);
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

  async function goNext() {
    // Los pasos 1 y 2 cargan título+fecha: recién ahí se crea el borrador.
    if (step === 2 || (eventId && step >= 2)) {
      const ok = await persist();
      if (!ok) return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
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
      if (publish) await setEventStatus(eventId, "published");
      router.push(`/dashboard/events/${eventId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar");
      setSaving(false);
    }
  }

  const canAdvanceStep1 = title.trim().length > 0;
  const canAdvanceStep2 = eventDate.length > 0;
  const activeThemeStyle = resolveEventTheme(theme, accentColor);
  const stepTransition = prefersReducedMotion ? { duration: 0 } : SPRING;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-2">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: activeThemeStyle.from, transformOrigin: "left" }}
                initial={false}
                animate={{ scaleX: index <= step ? 1 : 0 }}
                transition={stepTransition}
              />
            </div>
            <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:block">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-neutral-500">
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
                    <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">¿Cuál es el mood de tu fiesta?</h1>
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
                      <h2 className="text-lg font-bold tracking-tight text-[#f5f4f1]">Tu logo (opcional)</h2>
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
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
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
                </div>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
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
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
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
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
                    Súbele una imagen
                  </h1>
                  <p className="text-sm text-neutral-400">Puedes saltar este paso y agregarlo después.</p>
                  <ImageUpload defaultValue={imageUrl} onChange={setImageUrl} />
                </div>
              ) : null}

              {step === 5 ? (
                <div className="flex flex-col gap-4">
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
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
                  <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
                    Listo para vender
                  </h1>
                  <div className="rounded-xl border border-white/10 bg-[#101010] p-5 text-sm text-neutral-300">
                    <p className="font-semibold text-[#f5f4f1]">{title}</p>
                    <p className="mt-1 text-neutral-400">
                      {eventDate ? new Date(eventDate).toLocaleString("es-CL") : "Sin fecha"}
                      {venue ? ` · ${venue}` : ""}
                    </p>
                    <p className="mt-3 text-neutral-400">
                      {ticketTypes.length > 0
                        ? `${ticketTypes.length} tipo(s) de entrada cargados`
                        : "Sin tipos de entrada todavía — puedes agregarlos después"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" disabled={saving} onClick={() => handleFinish(true)}>
                      Crear y publicar
                    </Button>
                    <Button variant="outline" disabled={saving} onClick={() => handleFinish(false)}>
                      Guardar como borrador
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

          {step < 6 ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" disabled={step === 0} onClick={goBack}>
                Atrás
              </Button>
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
            </div>
          ) : null}
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
