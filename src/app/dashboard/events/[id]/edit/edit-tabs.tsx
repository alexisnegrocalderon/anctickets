"use client";

/**
 * Pestañas internas de la edición de evento: una sección a la vez. Todos los
 * paneles quedan montados (solo se ocultan), así un formulario a medio llenar
 * no se pierde al cambiar de pestaña. En celular la tira se desliza con el dedo.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type EditTab = { id: string; label: string; content: ReactNode };

export default function EditTabs({ tabs, initialTab }: { tabs: EditTab[]; initialTab?: string }) {
  const [active, setActive] = useState(() => (tabs.some((t) => t.id === initialTab) ? initialTab! : tabs[0].id));
  const listRef = useRef<HTMLDivElement>(null);

  // Mantiene la pestaña activa a la vista dentro de la tira deslizable.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  function select(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-[var(--anc-border)] bg-[var(--anc-bg)]/95 px-4 backdrop-blur md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Secciones del evento"
          className="anc-tabs scrollbar-none flex gap-1 overflow-x-auto"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`relative min-h-12 shrink-0 px-4 text-sm font-semibold transition-colors duration-200 ${
                  selected ? "text-white" : "text-[var(--anc-muted-text)] hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-[var(--anc-vermilion)] transition-transform duration-300 [transition-timing-function:var(--ease-out)]"
                  style={{ transform: selected ? "scaleX(1)" : "scaleX(0)" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
