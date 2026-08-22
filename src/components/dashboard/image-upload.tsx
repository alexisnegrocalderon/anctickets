"use client";

/** ANC dashboard: sube una imagen de evento a Supabase Storage, con preview. */
import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ImageUpload({
  name,
  defaultValue,
  onChange,
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (url: string) => void;
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
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

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
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Vista previa del evento" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]"
        >
          {uploading ? "Subiendo..." : imageUrl ? "Cambiar imagen" : "Subir imagen"}
        </label>

        <input
          type="url"
          placeholder="o pega una URL externa"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f5f4f1] placeholder:text-neutral-500 transition focus:border-[#a77fff] focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
