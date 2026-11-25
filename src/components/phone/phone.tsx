/**
 * ANC — iPhone 3D hecho solo con CSS (perspective + transforms, sin Three.js).
 * El cuerpo es una pila de láminas con translateZ para dar grosor; la pantalla
 * es un contenedor de tamaño propio: todo lo de adentro se mide en cqw, así el
 * mismo mockup sirve de 190px a 300px de ancho.
 */
export default function Phone({
  children,
  mode = "scene",
  label,
}: {
  children: React.ReactNode;
  /** "hero" flota y gira solo; "scene" se inclina según el scroll. */
  mode?: "hero" | "scene";
  /** Descripción accesible del contenido de la pantalla. */
  label: string;
}) {
  return (
    <div className="ph-stage" data-mode={mode}>
      <div className="ph-glow" aria-hidden="true" />
      <div className="ph" role="img" aria-label={label}>
        <div className="ph-spin">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className="ph-slab" style={{ transform: `translateZ(${-i * 2}px)` }} aria-hidden="true" />
          ))}
          <span className="ph-btn ph-btn-a" aria-hidden="true" />
          <span className="ph-btn ph-btn-b" aria-hidden="true" />
          <span className="ph-btn ph-btn-c" aria-hidden="true" />
          <div className="ph-face">
            <div className="ph-screen" aria-hidden="true">
              <div className="ph-island" />
              <div className="ph-status">
                <span>9:41</span>
                <span className="ph-status-icons">
                  <i />
                  <i />
                  <b />
                </span>
              </div>
              {children}
            </div>
            <span className="ph-sheen" aria-hidden="true" />
          </div>
        </div>
        <div className="ph-shadow" aria-hidden="true" />
      </div>
    </div>
  );
}
