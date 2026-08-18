import { createEvent } from "../actions";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">
        Nuevo evento
      </h1>
      <form action={createEvent} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Título del evento
          <input
            name="title"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Fiesta ANC Verano"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Descripción
          <textarea
            name="description"
            rows={4}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Lugar
          <input
            name="venue"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Recinto, dirección"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Fecha y hora
          <input
            type="datetime-local"
            name="event_date"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          URL de imagen (opcional)
          <input
            name="image_url"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Crear evento
        </button>
      </form>
    </div>
  );
}
