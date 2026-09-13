"use client";

/**
 * ANC dashboard: selector de mood/color de marca para el formulario plano de
 * "Datos del evento" en la edición (a diferencia del wizard, que lleva su
 * propio estado de React). Expone `theme` y `accent_color` como inputs
 * ocultos para que funcione con un <form action={serverAction}> normal.
 */
import { useState } from "react";
import { isValidHex } from "@/lib/color";
import { EVENT_THEME_OPTIONS, EVENT_THEME_STYLES } from "@/lib/event-themes";
import type { EventTheme } from "@/lib/database.types";

export default function ThemePicker({
  defaultTheme,
  defaultAccentColor,
}: {
  defaultTheme: EventTheme;
  defaultAccentColor: string | null;
}) {
  const [theme, setTheme] = useState<EventTheme>(defaultTheme);
  const [accentColor, setAccentColor] = useState(
    defaultAccentColor && isValidHex(defaultAccentColor) ? defaultAccentColor : "#FF206E",
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="accent_color" value={theme === "custom" && isValidHex(accentColor) ? accentColor : ""} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {EVENT_THEME_OPTIONS.map((option) => {
          const style = EVENT_THEME_STYLES[option.value];
          const selected = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className="flex h-16 flex-col justify-end rounded-xl p-3 text-left transition"
              style={{
                backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})`,
                boxShadow: selected ? `0 0 0 2px ${style.from}` : undefined,
              }}
            >
              <span className="text-xs font-black leading-tight" style={{ color: style.ink }}>
                {option.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setTheme("custom")}
          className="flex h-16 items-center justify-between rounded-xl border border-dashed border-white/25 p-3 text-left"
          style={{ boxShadow: theme === "custom" ? `0 0 0 2px ${accentColor}` : undefined }}
        >
          <span className="text-xs font-black leading-tight text-[#f5f4f1]">Personalizado</span>
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-white/30"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
        </button>
      </div>

      {theme === "custom" ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-white/15 bg-transparent"
            aria-label="Elegir color de marca"
          />
          <input
            type="text"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            placeholder="#FF206E"
            className="w-32 rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm font-mono uppercase text-[#f5f4f1] focus:border-[var(--anc-accent)] focus:outline-none"
          />
          {!isValidHex(accentColor) ? (
            <p className="text-xs text-red-400">Hex inválido</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
