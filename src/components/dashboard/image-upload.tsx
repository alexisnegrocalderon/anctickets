"use client";

/** ANC dashboard: sube una imagen de evento a Supabase Storage, con preview. */
import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUpload({
  name,
  defaultValue,
  onChange,
  variant = "flyer",
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (url: string) => void;
  /** "flyer" (por defecto, 16:9 recortado) o "logo" (cuadrado, sin recortar). */
  variant?: "flyer" | "logo";
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrlState] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setImageUrl(url: string) {
    setImageUrlState(url);
    onChange?.(url);
  }

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Sube una imagen JPG, PNG, WebP, GIF o AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen pesa más de 5 MB. Comprímela e intenta de nuevo.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");

      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Mismo bucket que el flyer: la política de Storage ya permite subir bajo
      // el propio uid, así que un logo no necesita bucket ni migración aparte.
      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={imageUrl} />

      {imageUrl ? (
        variant === "logo" ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/15 bg-black/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Vista previa del logo" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Vista previa del evento" className="h-full w-full object-cover" />
          </div>
        )
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
        >
          {uploading ? "Subiendo..." : imageUrl ? "Cambiar imagen" : "Subir imagen"}
        </label>

        <input
          type="url"
          placeholder="o pega una URL externa"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f5f4f1] placeholder:text-neutral-500 transition focus:border-[var(--anc-accent)] focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
