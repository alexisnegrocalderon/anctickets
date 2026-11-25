"use client";

/** ANC dashboard: sube una imagen a Supabase Storage. La miniatura es el control para cambiarla. */
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

  function openPicker() {
    fileInputRef.current?.click();
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

  const isLogo = variant === "logo";
  const tileSize = isLogo ? "h-28 w-28" : "aspect-video w-full max-w-md";

  return (
    <div className="flex flex-col gap-2.5">
      <input type="hidden" name={name} value={imageUrl} />
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          // Permite volver a elegir el mismo archivo.
          event.target.value = "";
        }}
      />

      {/* La miniatura es el control: tocarla (o Enter/Espacio) abre el selector. */}
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        aria-label={imageUrl ? (isLogo ? "Cambiar logo" : "Cambiar imagen") : isLogo ? "Subir logo" : "Subir imagen"}
        className={`group relative flex items-center justify-center overflow-hidden rounded-2xl border bg-black/30 transition active:scale-[.99] disabled:opacity-70 ${tileSize} ${
          imageUrl
            ? "border-white/15 hover:border-[var(--anc-accent-light)]"
            : "border-dashed border-white/25 hover:border-[var(--anc-accent-light)]"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={isLogo ? "Logo cargado" : "Imagen cargada"}
            className={`h-full w-full ${isLogo ? "object-contain p-2" : "object-cover"}`}
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-3 text-center text-sm font-semibold text-neutral-300">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--anc-vermilion)]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {uploading ? "Subiendo..." : isLogo ? "Subir logo" : "Subir imagen"}
          </span>
        )}
        {uploading && imageUrl ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
            Subiendo...
          </span>
        ) : null}
      </button>

      {imageUrl ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span role="status" className="font-semibold text-emerald-400">
            ✓ Imagen guardada
          </span>
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline underline-offset-4 transition hover:text-white"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={() => setImageUrl("")}
            disabled={uploading}
            className="inline-flex min-h-11 items-center text-sm text-neutral-500 underline underline-offset-4 transition hover:text-red-300"
          >
            Quitar
          </button>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
