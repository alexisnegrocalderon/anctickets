/**
 * ANC — hueco de imagen a la espera del asset real.
 * Se ve intencional (no como un error), y documenta en pantalla qué imagen va
 * ahí para que sea fácil de reemplazar por un <Image> real más adelante.
 */
export default function AssetPlaceholder({
  label,
  spec,
  ratio = "16/10",
  className = "",
}: {
  label: string;
  spec: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden border-2 border-dashed border-white/15 bg-[#161616] px-6 text-center ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0 12px, rgba(255,255,255,.03) 12px 24px)",
        }}
        aria-hidden="true"
      />
      <p className="relative font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[var(--anc-turquoise)]">
        {label}
      </p>
      <p className="relative max-w-xs text-sm leading-5 text-neutral-400">{spec}</p>
    </div>
  );
}
