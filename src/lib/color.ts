/**
 * ANC — utilidades de color para el branding personalizado por evento.
 * Sin dependencias: solo lo necesario para validar un hex, calcular
 * contraste WCAG y derivar tonos claros/oscuros de un color de marca.
 */

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.round(Math.min(255, Math.max(0, c)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Razón de contraste WCAG entre dos colores hex (1 a 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** El color de texto (blanco cálido o casi-negro) que más contraste da sobre `bgHex`. */
export function pickReadableText(bgHex: string): string {
  const warmWhite = "#f5f4f1";
  const nearBlack = "#0b0b0b";
  return contrastRatio(bgHex, warmWhite) >= contrastRatio(bgHex, nearBlack) ? warmWhite : nearBlack;
}

function mixTowards(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  );
}

/** Mezcla el color hacia negro — para el segundo stop de un degradé. */
export function darken(hex: string, amount = 0.35): string {
  return mixTowards(hex, [0, 0, 0], amount);
}

/** Mezcla el color hacia blanco — para un acento legible sobre fondo oscuro. */
export function lighten(hex: string, amount = 0.4): string {
  return mixTowards(hex, [255, 255, 255], amount);
}
