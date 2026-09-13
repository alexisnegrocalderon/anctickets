/** ANC — metodología editorial numerada 01-06, al estilo manifiesto de agencia. */
const PASOS = [
  { n: "01", t: "Creas tu cuenta", d: "Entras con Google. Sin formularios eternos, sin tarjeta de crédito." },
  { n: "02", t: "Conectas Mercado Pago", d: "La cuenta de tu organización, la que tú ya usas para cobrar." },
  { n: "03", t: "Publicas tu evento", d: "Nombre, fecha, lugar, tipos de entrada y precio. En una sentada." },
  { n: "04", t: "Compartes el link", d: "Un link propio, listo para tu historia, sin marca de nadie más." },
  { n: "05", t: "Vendes sin intermediarios", d: "Cada venta cae directo en tu cuenta. Nosotros no la tocamos." },
  { n: "06", t: "Controlas la puerta", d: "Tu staff escanea el QR desde su propio teléfono. Uno usado no vuelve a entrar." },
];

export default function Methodology() {
  return (
    <ol className="divide-y divide-[var(--anc-border)] border-y border-[var(--anc-border)]">
      {PASOS.map((paso, index) => (
        <li
          key={paso.n}
          className="reveal grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 py-8 sm:grid-cols-[5rem_1fr_1.4fr] sm:gap-x-10"
          data-reveal-delay={index * 60}
        >
          <span className="font-display text-3xl font-black text-[var(--anc-ink)]/25 sm:text-4xl">{paso.n}</span>
          <p className="font-display text-2xl font-black leading-tight text-[var(--anc-ink)] sm:text-3xl">{paso.t}</p>
          <p className="col-span-2 text-base leading-6 text-[var(--anc-ink-muted)] sm:col-span-1 sm:mt-1">{paso.d}</p>
        </li>
      ))}
    </ol>
  );
}
