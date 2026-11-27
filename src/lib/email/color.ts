/**
 * Colores del correo. Un solo diseño que se adapta al acento de la productora:
 * se valida el hex, se calcula el texto del botón por contraste (WCAG) y se
 * ajusta el acento cuando es demasiado claro (amarillo sobre blanco) o
 * demasiado oscuro (casi negro sobre el fondo oscuro del modo nocturno).
 */
import type { EventTheme } from "@/lib/database.types";
import { contrastRatio, darken, isValidHex, lighten } from "@/lib/color";
import { EVENT_THEME_STYLES } from "@/lib/event-themes";

export const DEFAULT_ACCENT = "#FF206E";

export const LIGHT = { page: "#f1efec", card: "#ffffff", text: "#161616", muted: "#5b5b5b", border: "#e4e1dc", soft: "#f6f4f1" };
export const DARK = { page: "#0d0d0e", card: "#19191b", text: "#f3f1ed", muted: "#b4b0aa", border: "#2e2e31", soft: "#222225" };

/** Texto del botón (#ffffff o #111111): el que más contraste da sobre el acento. */
export function pickTextColor(bgHex: string): string {
  if (!isValidHex(bgHex)) return "#ffffff";
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#111111") ? "#ffffff" : "#111111";
}

/** Acento utilizable: el hex válido, o null. */
export function validAccent(value: string | null | undefined): string | null {
  return typeof value === "string" && isValidHex(value.trim()) ? value.trim().toLowerCase() : null;
}

/** Mismo criterio que la página pública: color propio solo si el mood es "custom" y es válido. */
export function resolveAccent(theme: EventTheme | null | undefined, accentColor: string | null | undefined): string {
  const t: EventTheme = theme && theme in EVENT_THEME_STYLES ? theme : "magenta";
  const custom = validAccent(accentColor);
  if (t === "custom" && custom) return custom;
  const curated = EVENT_THEME_STYLES[t].from.toLowerCase();
  return isValidHex(curated) ? curated : DEFAULT_ACCENT.toLowerCase();
}

/** Aclara u oscurece `hex` de a poco hasta alcanzar `min` de contraste contra `against`. */
export function ensureContrast(hex: string, against: string, min: number): string {
  if (contrastRatio(hex, against) >= min) return hex;
  const towardLight = contrastRatio("#ffffff", against) > contrastRatio("#000000", against);
  for (let amount = 0.05; amount <= 1.0001; amount += 0.05) {
    const next = towardLight ? lighten(hex, amount) : darken(hex, amount);
    if (contrastRatio(next, against) >= min) return next;
  }
  return towardLight ? "#ffffff" : "#000000";
}

export interface EmailPalette {
  /** Acento tal cual (validado). */
  accent: string;
  /** Fondo y texto del botón en modo claro. */
  btnBg: string;
  btnText: string;
  /** Borde del botón cuando el acento casi se funde con la tarjeta blanca (amarillos). */
  btnBorder: string | null;
  /** Acento legible como texto sobre tarjeta blanca (>= 4.5:1). */
  inkLight: string;
  /** Lo mismo en modo oscuro. */
  btnBgDark: string;
  btnTextDark: string;
  btnBorderDark: string | null;
  inkDark: string;
}

/** Paleta completa del correo a partir del acento (null o inválido = acento por defecto). */
export function buildPalette(accentInput: string | null | undefined): EmailPalette {
  const accent = validAccent(accentInput) ?? DEFAULT_ACCENT.toLowerCase();

  const btnBg = accent;
  const btnText = pickTextColor(btnBg);
  const btnBorder = contrastRatio(btnBg, LIGHT.card) < 1.6 ? darken(btnBg, 0.4) : null;
  const inkLight = ensureContrast(accent, LIGHT.card, 4.5);

  // En oscuro, un acento casi negro se aclara hasta ser visible sobre la tarjeta.
  const btnBgDark = contrastRatio(accent, DARK.card) < 3 ? ensureContrast(accent, DARK.card, 3) : accent;
  const btnTextDark = pickTextColor(btnBgDark);
  const btnBorderDark = contrastRatio(btnBgDark, DARK.card) < 1.6 ? lighten(btnBgDark, 0.3) : null;
  const inkDark = ensureContrast(accent, DARK.card, 4.5);

  return { accent, btnBg, btnText, btnBorder, inkLight, btnBgDark, btnTextDark, btnBorderDark, inkDark };
}
