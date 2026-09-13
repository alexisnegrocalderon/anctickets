/**
 * ANC: versión sin WebGL del cluster de pulseras/tickets — mobile, prefers-reduced-motion,
 * o navegadores sin soporte 3D. Misma composición aproximada (blobs de color flotando),
 * sin el peso de Three.js.
 */
const BLOBS = [
  { color: "#FF206E", top: "18%", left: "62%", size: 120, delay: "0s" },
  { color: "#FBFF12", top: "58%", left: "74%", size: 90, delay: ".6s" },
  { color: "#41EAD4", top: "36%", left: "80%", size: 70, delay: "1.1s" },
  { color: "#222222", top: "68%", left: "58%", size: 100, delay: "1.6s" },
] as const;

export default function HeroSceneFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {BLOBS.map((blob) => (
        <span
          key={blob.color + blob.top}
          className="anc-hero-blob absolute rounded-full blur-2xl"
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            opacity: 0.35,
            animationDelay: blob.delay,
          }}
        />
      ))}
    </div>
  );
}
