/**
 * Estado de instalación de la PWA para useSyncExternalStore.
 * El evento beforeinstallprompt se captura temprano con un script inline en el
 * layout raíz (window.__ancInstallPrompt) para no perderlo antes de hidratar.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __ancInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const INSTALL_EVENT = "anc:installprompt";
const DISMISS_KEY = "anc:install-banner-dismissed";
const DISMISS_EVENT = "anc:install-banner-dismiss";

export function subscribeInstall(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  window.addEventListener(INSTALL_EVENT, cb);
  window.addEventListener("appinstalled", cb);
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(INSTALL_EVENT, cb);
    window.removeEventListener("appinstalled", cb);
    mq.removeEventListener("change", cb);
  };
}

export function getStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  } catch {
    return false;
  }
}

export function getCanPrompt(): boolean {
  return !!window.__ancInstallPrompt;
}

export function getIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** En iOS solo Safari instala bien; otros navegadores piden abrir en Safari. */
export function getIosNonSafari(): boolean {
  return getIos() && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);
}

export async function promptInstall(): Promise<boolean> {
  const evt = window.__ancInstallPrompt;
  if (!evt) return false;
  window.__ancInstallPrompt = null;
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    return choice.outcome === "accepted";
  } catch {
    return false;
  } finally {
    window.dispatchEvent(new Event(INSTALL_EVENT));
  }
}

// ---- Banner descartable -------------------------------------------------------

export function subscribeDismiss(cb: () => void) {
  window.addEventListener(DISMISS_EVENT, cb);
  return () => window.removeEventListener(DISMISS_EVENT, cb);
}

export function getDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // sin almacenamiento: se oculta solo hasta recargar
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}
