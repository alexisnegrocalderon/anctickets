/** Wizard de creación de evento (solo HTML/CSS; la animación la dispara .scene.is-in). */
const FIELDS = [
  { label: "Nombre del evento", value: "Noche Neón" },
  { label: "Fecha y hora", value: "Sáb 14 dic · 22:00" },
  { label: "Entrada General", value: "$12.000 · 400 cupos" },
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
      </div>

      <div className="wz-preview">
        <span className="wz-preview-art">Noche Neón</span>
        <span className="wz-preview-meta">Vista previa de tu página · Sáb 14 dic</span>
      </div>

      <div className="wz-end">
        <div className="wz-cta">Publicar evento</div>
        <div className="wz-live">
        <span className="wz-live-dot" aria-hidden="true">
          ✓
        </span>
        <strong>Tu evento está en vivo</strong>
        <small>tickets.ancdigital.cl/noche-neon</small>
        </div>
      </div>
    </div>
  );
}
