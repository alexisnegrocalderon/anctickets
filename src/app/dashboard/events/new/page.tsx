import { createEvent } from "../actions";

const inputClass =
  "rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f5f4f1] placeholder:text-neutral-500 transition focus:border-[#a77fff] focus:outline-none";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-[#f5f4f1]">
        Nuevo evento
      </h1>
      <form action={createEvent} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
          Título del evento
          <input
            name="title"
            required
            className={inputClass}
            placeholder="Fiesta ANC Verano"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
          Descripción
          <textarea name="description" rows={4} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
          Lugar
          <input
            name="venue"
            className={inputClass}
            placeholder="Recinto, dirección"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
          Fecha y hora
          <input
            type="datetime-local"
            name="event_date"
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
          URL de imagen (opcional)
          <input
            name="image_url"
            className={inputClass}
            placeholder="https://..."
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-full bg-[#a77fff] px-6 py-3 text-sm font-semibold text-[#120d1b] transition hover:bg-[#c3adff]"
        >
          Crear evento
        </button>
      </form>
    </div>
  );
}
