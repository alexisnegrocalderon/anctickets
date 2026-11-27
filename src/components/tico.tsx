/**
 * Tico, la mascota de ANC Tickets. Decorativo por defecto (aria-hidden): quien
 * use un lector de pantalla no oye "imagen" en cada pantalla. Pásale `alt` solo
 * cuando Tico diga algo que no esté ya escrito en la página.
 *
 * `motion`: "bob" = rebote suave en reposo; "pop" = aparece con un saltito;
 * "none" = fijo. Todo se apaga con prefers-reduced-motion (ver brand.css).
 */
import { ticoHeight, ticoSrc, type TicoPose } from "@/lib/tico";

export default function Tico({
  pose = "idle",
  width = 96,
  motion = "bob",
  alt,
  priority = false,
  className = "",
}: {
  pose?: TicoPose;
  /** Ancho en px; el alto sale de las proporciones de la pose. */
  width?: number;
  motion?: "bob" | "pop" | "none";
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- recortes livianos de /public, tamaño fijo conocido
    <img
      src={ticoSrc(pose)}
      width={width}
      height={ticoHeight(pose, width)}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      data-tico-motion={motion === "none" ? undefined : motion}
      className={`tico-img ${className}`}
    />
  );
}
