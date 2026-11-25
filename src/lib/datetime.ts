/**
 * Fechas de ventas (sales_start / sales_end). Los <input type="datetime-local">
 * entregan la hora "de pared" sin zona; el servidor corre en UTC, así que hay
 * que interpretarla explícitamente como hora de Chile para que "cierra a las
 * 23:00" signifique las 23:00 de Chile y no las de UTC.
 */
const TZ = "America/Santiago";

function tzOffsetMs(ts: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** "2026-12-24T21:30" (hora de Chile) -> ISO UTC. Devuelve null si el texto no es válido. */
export function chileLocalToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = naive - tzOffsetMs(naive);
  guess = naive - tzOffsetMs(guess);
  return new Date(guess).toISOString();
}

/** ISO UTC -> "2026-12-24T21:30" en hora de Chile, para el valor de un datetime-local. */
export function isoToChileInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  return new Date(ts + tzOffsetMs(ts)).toISOString().slice(0, 16);
}
