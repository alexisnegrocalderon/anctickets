"use client";

import { useLinkStatus } from "next/link";

/**
 * Va DENTRO de un <Link>. Mientras esa navegación está pendiente deja una marca
 * invisible (data-nav-pending) que el CSS usa para encender la barra de
 * progreso superior del panel. No añade nada al layout.
 */
export default function PendingMark() {
  const { pending } = useLinkStatus();
  return pending ? <span hidden data-nav-pending="" /> : null;
}
