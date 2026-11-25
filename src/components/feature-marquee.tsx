/** Cinta infinita de funciones: CSS puro, pausa al tocar/hover, estática con reduced motion. */
const ITEMS = ["Descuentos", "Embajadores", "Escáner QR", "Staff de puerta", "Cortesías", "Pago directo"];

export default function FeatureMarquee() {
  return (
    <div className="marq relative z-[1]" role="region" aria-label="Funciones incluidas">
      <ul className="marq-track">
        {ITEMS.map((t) => (
          <li key={t} className="marq-pill">
            <i aria-hidden="true" />
            {t}
          </li>
        ))}
        {ITEMS.map((t) => (
          <li key={`${t}-2`} className="marq-pill marq-dup" aria-hidden="true">
            <i aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
