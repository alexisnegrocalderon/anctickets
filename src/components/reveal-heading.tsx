/**
 * ANC — titular que entra palabra por palabra, de borroso a nítido, al aparecer
 * en pantalla. El texto completo está en el HTML inicial (SEO, sin JS); el
 * efecto lo activa ScrollReveal con .motion-on y se apaga con reduced motion.
 * No se usa en el H1 del hero para no tocar el LCP.
 */
import { Fragment, type CSSProperties } from "react";

export type HeadingPart = { t: string; accent?: boolean };

export default function RevealHeading({
  as: Tag = "h2",
  parts,
  className = "",
}: {
  as?: "h2" | "h3";
  parts: HeadingPart[];
  className?: string;
}) {
  let index = 0;
  return (
    <Tag className={`rh ${className}`}>
      {parts.map((part, pi) => (
        <span key={pi} className={part.accent ? "text-[var(--anc-vermilion)]" : undefined}>
          {part.t
            .split(" ")
            .filter(Boolean)
            .map((word, wi, all) => (
              <Fragment key={wi}>
                <span className="rh-w" style={{ ["--i" as string]: index++ } as CSSProperties}>
                  {word}
                </span>
                {wi < all.length - 1 || pi < parts.length - 1 ? " " : null}
              </Fragment>
            ))}
        </span>
      ))}
    </Tag>
  );
}
