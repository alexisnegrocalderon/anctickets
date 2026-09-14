"use client";

/**
 * ANC dashboard: el link corto y memorable del evento. Muestra el dominio
 * fijo como prefijo no editable y deja escribir solo la parte que importa,
 * normalizada en vivo (minúsculas, sin acentos, guiones) para que lo que ve
 * el productor sea exactamente lo que va a quedar en la URL.
 */
import { useState } from "react";
import { slugify } from "@/lib/slug";

export default function SlugField({ defaultValue, host }: { defaultValue: string; host: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <div className="flex items-center overflow-hidden rounded-lg border border-white/15 focus-within:border-[var(--anc-accent)]">
        <span className="whitespace-nowrap bg-white/5 px-3 py-2 text-sm text-neutral-500">{host}/</span>
        <input
          name="slug"
          value={value}
          onChange={(e) => setValue(slugify(e.target.value))}
          className="w-full bg-transparent px-2 py-2 text-sm text-[#f5f4f1] outline-none"
          placeholder="mi-fiesta"
        />
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">
        Corto y fácil de decir en tu historia. Si lo cambias, el link viejo deja de funcionar.
      </p>
    </div>
  );
}
