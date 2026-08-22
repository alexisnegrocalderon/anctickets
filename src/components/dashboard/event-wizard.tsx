"use client";

/**
 * ANC dashboard: wizard de creación de evento — secuencia de pasos saltables en vez
 * de un formulario plano. Apenas se completan título+fecha (paso 2) el evento ya
 * queda guardado como borrador: si el usuario abandona el wizard, retoma desde
 * "Mis eventos" → editar, sin perder nada.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftEvent, updateEvent, createTicketType, setEventStatus } from "@/app/dashboard/events/actions";
import { Button, Field, Input, Textarea } from "@/components/dashboard/ui";
import ImageUpload from "@/components/dashboard/image-upload";

type DraftTicketType = { name: string; base_price: number; quantity: number };

const STEP_LABELS = [
  "Título",
  "Fecha y lugar",
  "Descripción",
  "Imagen",
  "Entradas",
  "Revisión",
] as const;

const TOTAL_STEPS = STEP_LABELS.length;

export default function EventWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Los pasos 0 y 1 cargan los campos obligatorios: recién ahí se crea el borrador.
    if (step === 1 || (eventId && step >= 1)) {
      const ok = await persist();
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
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

  const canAdvanceStep0 = title.trim().length > 0;
  const canAdvanceStep1 = eventDate.length > 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-2">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition ${
                index <= step ? "bg-[#a77fff]" : "bg-white/10"
              }`}
            />
            <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:block">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Paso {step + 1} de {TOTAL_STEPS} · {STEP_LABELS[step]}
      </p>

      {step === 0 ? (
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

      {step === 1 ? (
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

      {step === 2 ? (
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

      {step === 3 ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
            Súbele una imagen
          </h1>
          <p className="text-sm text-neutral-400">Puedes saltar este paso y agregarlo después.</p>
          <ImageUpload defaultValue={imageUrl} onChange={setImageUrl} />
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
            ¿Qué entradas vas a vender?
          </h1>
          <p className="text-sm text-neutral-400">
            Puedes saltar este paso y agregar tipos de entrada más tarde desde el evento.
          </p>

          {ticketTypes.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {ticketTypes.map((tt, index) => (
                <li
                  key={`${tt.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="text-[#f5f4f1]">{tt.name}</span>
                  <span className="text-neutral-400">
                    ${tt.base_price.toLocaleString("es-CL")} · cupo {tt.quantity}
                  </span>
                </li>
              ))}
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

      {step === 5 ? (
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

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {step < 5 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={step === 0} onClick={goBack}>
            Atrás
          </Button>
          <div className="flex gap-2">
            {step >= 2 ? (
              <Button variant="outline" disabled={saving} onClick={goNext}>
                Saltar
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={
                saving ||
                (step === 0 && !canAdvanceStep0) ||
                (step === 1 && !canAdvanceStep1)
              }
              onClick={goNext}
            >
              {saving ? "Guardando..." : "Siguiente"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
