/** ANC — grilla de capacidades del producto: solo texto, sin imágenes pesadas ni huecos de captura. */
export default function PlaybookGrid({
  items,
}: {
  items: { title: string; spec: string }[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {items.map((item, index) => (
        <li
          key={item.title}
          className="reveal rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-6"
          data-reveal-delay={index * 70}
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[.16em] text-[var(--anc-vermilion)]">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-4 font-display text-3xl uppercase leading-[1] text-white">{item.title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--anc-muted-text)]">{item.spec}</p>
        </li>
      ))}
    </ul>
  );
}
