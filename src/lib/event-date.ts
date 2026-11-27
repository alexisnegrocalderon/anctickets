/**
 * Fecha del evento tal como la muestra la página pública. El evento guarda la
 * hora "de pared" que ingresó la productora como si fuera UTC, y TODAS las
 * pantallas la formatean sin zona explícita con estas mismas llamadas. El correo
 * usa este helper para decir exactamente lo mismo que la página. No "corregir"
 * la zona horaria aquí.
 */
export function eventDateParts(iso: string) {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("es-CL", { weekday: "long" });
  const day = date.toLocaleDateString("es-CL", { day: "2-digit" });
  const month = date.toLocaleDateString("es-CL", { month: "short" }).replace(".", "").toUpperCase();
  const time = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  return { weekday, day, month, time };
}

/** "viernes 12 DIC · 22:00" — misma información que el hero de la página. */
export function formatEventWhen(iso: string): string {
  if (Number.isNaN(new Date(iso).getTime())) return "";
  const { weekday, day, month, time } = eventDateParts(iso);
  return `${weekday} ${day} ${month} · ${time} hrs`;
}
