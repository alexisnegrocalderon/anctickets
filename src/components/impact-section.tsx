/**
 * ANC — quiebre de impacto: una frase corta y enorme sobre el lienzo oscuro,
 * a pantalla casi completa. Sin video ni imágenes externas: carga instantánea.
 */
export default function ImpactSection({
  children,
  id,
  tone = "dark",
}: {
  children: React.ReactNode;
  id?: string;
  /** "surface" sube un escalón de gris para separar quiebres consecutivos. */
  tone?: "dark" | "surface";
}) {
  return (
    <section
      id={id}
      className="relative flex min-h-[64svh] items-center justify-center overflow-hidden px-4 py-20 sm:px-10"
      style={{ background: tone === "surface" ? "var(--anc-surface)" : "var(--anc-bg)" }}
    >
      <div className="reveal relative text-center">{children}</div>
    </section>
  );
}
