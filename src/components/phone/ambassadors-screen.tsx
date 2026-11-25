/** Embajadores, código de descuento y pago directo a Mercado Pago (solo HTML/CSS). */
import PhoneTabs from "./tabs";

const RANKING = [
  { name: "Valentina", sold: 42 },
  { name: "Matías", sold: 31 },
  { name: "Josefa", sold: 24 },
  { name: "Tomás", sold: 12 },
];

export default function AmbassadorsScreen() {
  return (
    <div className="am">
      <div className="lv-bar">
        <span className="lv-title">Embajadores</span>
        <span className="lv-tag">Ejemplo</span>
      </div>

      <p className="lv-label am-label">Ranking de ventas</p>
      <ol className="am-rank">
        {RANKING.map((r, i) => (
          <li key={r.name} style={{ ["--i" as string]: i }}>
            <span className="am-pos">{i + 1}</span>
            <span className="am-name">
              {r.name}
              <span className="am-role">Embajador</span>
            </span>
            <span className="am-bar">
              <span style={{ width: `${(r.sold / 42) * 100}%` }} />
            </span>
            <span className="am-n">{r.sold}</span>
          </li>
        ))}
      </ol>

      <div className="am-code">
        <div>
          <p className="lv-label">Código de descuento</p>
          <p className="am-code-val">NEON10</p>
        </div>
        <span className="am-off">-10%</span>
      </div>

      <div className="am-pay">
        <span className="am-pay-ico" aria-hidden="true">
          $
        </span>
        <span>
          <strong>Directo a tu Mercado Pago</strong>
          <small>+$24.000 · acreditado ahora</small>
        </span>
      </div>
      <div className="am-total">
        <small>Ventas con código</small>
        <strong>{RANKING.reduce((n, r) => n + r.sold, 0)} entradas</strong>
      </div>
      <PhoneTabs on="Más" />
    </div>
  );
}
