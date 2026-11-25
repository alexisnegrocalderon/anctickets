/** ANC — una escena: texto a un lado y el celular mostrando esa pantalla. */
import Phone from "@/components/phone/phone";

export default function AppScene({
  id,
  eyebrow,
  title,
  body,
  label,
  reverse = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  label: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-scene data-rev={reverse ? "" : undefined} className="scene px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="scene-copy">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(2.6rem,9vw,4.8rem)] uppercase leading-[.96] text-white">{title}</h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-7 text-white/75">{body}</p>
        </div>
        <div className="scene-phone">
          <Phone label={label}>{children}</Phone>
        </div>
      </div>
    </section>
  );
}
