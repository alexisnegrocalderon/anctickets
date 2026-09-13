import type { EventTheme } from "@/lib/database.types";

export const EVENT_THEME_OPTIONS: { value: EventTheme; label: string }[] = [
  { value: "magenta", label: "Magenta Night" },
  { value: "yellow", label: "Yellow Rave" },
  { value: "turquoise", label: "Turquoise Wave" },
  { value: "charcoal", label: "Charcoal Underground" },
];

/** Colores del sistema "Retro Future" que cada tema de evento resuelve para su tarjeta pública. */
export const EVENT_THEME_STYLES: Record<
  EventTheme,
  { from: string; to: string; ink: string; text: string }
> = {
  magenta: { from: "#FF206E", to: "#B3134F", ink: "#f5f4f1", text: "#FF6FA0" },
  yellow: { from: "#FBFF12", to: "#B3B300", ink: "#160f00", text: "#8A8400" },
  turquoise: { from: "#41EAD4", to: "#1F9E8F", ink: "#062622", text: "#0d6b60" },
  charcoal: { from: "#3a3a3a", to: "#161616", ink: "#f5f4f1", text: "#FF6FA0" },
};
