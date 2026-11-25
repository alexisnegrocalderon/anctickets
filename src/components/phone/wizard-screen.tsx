/** Wizard de creación de evento: flyer, fecha, entradas y publicar (solo HTML/CSS; se anima con .fs-live .is-active). */
const FIELDS = [
  { label: "Nombre del evento", value: "Noche Neón" },
  { label: "Fecha y hora", value: "Sáb 14 dic · 22:00" },
];

export default function WizardScreen() {
  return (
    <div className="wz">
      <div className="lv-bar">
        <span className="lv-title">Nuevo evento</span>
        <span className="lv-tag">Ejemplo</span>
      </div>

      <ol className="wz-steps">
        {["Datos", "Fecha", "Entradas"].map((s, i) => (
          <li key={s} style={{ ["--i" as string]: i }}>
            <b>{i + 1}</b>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="wz-progress">
        <span />
      </div>

      <div className="wz-flyer">
        <span className="wz-flyer-art">Noche Neón</span>
        <span className="wz-flyer-date">
          <b>14</b>
          <i>Dic</i>
        </span>
        <span className="wz-flyer-meta">Flyer del evento · Sáb 22:00</span>
      </div>

      <div className="wz-fields">
        {FIELDS.map((f, i) => (
          <div key={f.label} className="wz-field" style={{ ["--i" as string]: i }}>
            <p className="lv-label">{f.label}</p>
            <p className="wz-value">
              <span className="wz-type">{f.value}</span>
              <em className="wz-tick" aria-hidden="true">
                ✓
              </em>
            </p>
          </div>
        ))}
        <div className="wz-field" style={{ ["--i" as string]: 2 }}>
          <p className="lv-label">Entradas</p>
          <p className="wz-value">
            <span className="wz-type">General · $12.000</span>
            <em className="wz-tick" aria-hidden="true">
              ✓
            </em>
          </p>
          <p className="wz-value wz-value-2">
            <span className="wz-type">VIP · $25.000</span>
            <em className="wz-tick" aria-hidden="true">
              ✓
            </em>
          </p>
        </div>
      </div>

      <div className="wz-link">
        <span>tickets.ancdigital.cl/noche-neon</span>
        <span className="wz-state">
          <em className="wz-state-a">Borrador</em>
          <em className="wz-state-b">En vivo</em>
        </span>
      </div>

      <div className="wz-cta">
        <span className="wz-cta-a">Publicar evento</span>
        <span className="wz-cta-b">✓ Publicado</span>
      </div>
    </div>
  );
}
