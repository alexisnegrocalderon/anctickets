/** Formatos del panel de administración: pesos chilenos y hora de Chile. */

const TZ = "America/Santiago";

export const clp = (n: number | string | null | undefined) => `$${Math.round(Number(n ?? 0)).toLocaleString("es-CL")}`;
export const int = (n: number | string | null | undefined) => Math.round(Number(n ?? 0)).toLocaleString("es-CL");

function parts(ts: number, opts: Intl.DateTimeFormatOptions) {
  const list = new Intl.DateTimeFormat("es-CL", { timeZone: TZ, hourCycle: "h23", ...opts }).formatToParts(new Date(ts));
  return (type: string) => (list.find((p) => p.type === type)?.value ?? "").replace(/\./g, "");
}

/** "14 dic 2026" en hora de Chile ("—" si falta o es inválida). */
export function fechaChile(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const g = parts(ts, { day: "numeric", month: "short", year: "numeric" });
  return `${g("day")} ${g("month")} ${g("year")}`;
}

/** "14 dic 2026, 22:00" en hora de Chile. */
export function fechaHoraChile(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const g = parts(ts, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return `${g("day")} ${g("month")} ${g("year")}, ${g("hour")}:${g("minute")}`;
}

/** "hace 5 min", "hace 3 h", "hace 2 días". */
export function haceCuanto(iso: string | null | undefined, now: number): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const min = Math.max(Math.floor((now - ts) / 60000), 0);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

/** "14 dic" corto para ejes de gráficos. */
export function diaCorto(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const g = parts(Date.UTC(y, m - 1, d, 12), { day: "numeric", month: "short" });
  return `${g("day")} ${g("month")}`;
}
