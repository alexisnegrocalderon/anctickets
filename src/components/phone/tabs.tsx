/** Barra inferior del celular de ejemplo (solo decorativa). */
const TABS = ["Resumen", "Ventas", "Escáner", "Más"];

export default function PhoneTabs({ on }: { on: string }) {
  return (
    <nav className="lv-tabs" aria-hidden="true">
      {TABS.map((t) => (
        <span key={t} data-on={t === on ? "" : undefined}>
          {t}
        </span>
      ))}
    </nav>
  );
}
