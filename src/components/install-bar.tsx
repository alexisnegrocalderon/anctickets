"use client";

/**
 * Barra de cristal para instalar, fija abajo solo en celular. Aparece cuando el
 * hero ya quedó atrás, se oculta cerca de la tarjeta de cierre, se puede
 * descartar (se recuerda en localStorage) y no se muestra si la app ya está
 * instalada.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import HeroSignup from "@/components/hero-signup";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { getStandalone, subscribeInstall } from "@/lib/pwa-install";

const KEY = "anc:home-install-bar-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

export default function InstallBar({ loggedIn }: { loggedIn: boolean }) {
  const standalone = useSyncExternalStore(subscribeInstall, getStandalone, () => true);
  const [pastHero, setPastHero] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true); // en el servidor, oculta
  const [closed, setClosed] = useState(false);
  const dismissed = storedDismissed || closed;

  useEffect(() => {
    const cta = document.getElementById("hero-cta");
    const end = document.getElementById("cierre");
    const obs: IntersectionObserver[] = [];
    if (cta) {
      const o = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0));
      o.observe(cta);
      obs.push(o);
    }
    if (end) {
      const o = new IntersectionObserver(([e]) => setNearEnd(e.isIntersecting), { rootMargin: "0px 0px 120px 0px" });
      o.observe(end);
      obs.push(o);
    }
    return () => obs.forEach((o) => o.disconnect());
  }, []);

  if (standalone || dismissed) return null;
  const show = pastHero && !nearEnd;

  return (
    <div className="ibar glass md:hidden" data-show={show ? "" : undefined} aria-hidden={show ? undefined : true} inert={!show}>
      <InstallAppButton variant="glass" className="min-w-0 flex-1" />
      <HeroSignup compact loggedIn={loggedIn} variant="ghost" label="Publicar gratis" showIcon={false} className="min-w-0 flex-1" />
      <button
        type="button"
        className="ibar-x"
        aria-label="Cerrar esta barra"
        onClick={() => {
          setClosed(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* sin storage: solo se oculta en esta visita */
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
