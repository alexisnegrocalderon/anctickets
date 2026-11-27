/**
 * Lógica pura de "Eliminar productora" (sin servidor ni base de datos): armado de
 * bloqueos y sus mensajes, comparación de la confirmación, enmascarado de correo y
 * normalización de la lista de cuentas protegidas. Las reglas de verdad viven en la
 * base (migración 0013); esto las repite en el servidor y las explica en español.
 */

export type BlockKey = "con_ventas" | "con_ventas_como_comprador" | "compras_pendientes" | "cuenta_protegida" | "no_existe";

export interface DeleteCounts {
  eventos: number;
  tandas: number;
  codigos: number;
  embajadores: number;
  staff: number;
  ordenes_vencidas: number;
  tiene_mp: boolean;
  entradas: number;
  ventas: number;
  ventas_comprador: number;
  pendientes: number;
  pendientes_vence_en: string | null;
}

/** Respuesta de admin_organizer_delete_preview(). */
export interface DeletePreview {
  existe: boolean;
  nombre: string | null;
  correo_enmascarado: string | null;
  puede_borrar: boolean;
  bloqueos: BlockKey[];
  conteos: Partial<DeleteCounts>;
}

const KNOWN: BlockKey[] = ["con_ventas", "con_ventas_como_comprador", "compras_pendientes", "cuenta_protegida", "no_existe"];

/** Normaliza la lista de cuentas protegidas: minúsculas, sin espacios, sin vacíos ni repetidos. */
export function normalizeProtectedEmails(list: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const raw of list) {
    const email = (raw ?? "").trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

/** "mar***@dominio.cl": primeras 3 letras del usuario + *** + dominio. Sin correo válido: null. */
export function maskEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim();
  const at = e.indexOf("@");
  if (at < 1) return null;
  return `${e.slice(0, Math.min(3, at))}***@${e.slice(at + 1)}`;
}

const nfc = (s: string) => s.normalize("NFC");

/** Texto que hay que escribir: el nombre de la productora o, si no tiene, el correo completo. */
export function expectedConfirmation(name: string | null | undefined, email: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  if (n) return nfc(n);
  const e = (email ?? "").trim();
  return e ? nfc(e) : null;
}

/** Comparación exacta (mayúsculas y tildes cuentan) tras recortar espacios de los extremos y unificar Unicode. */
export function confirmationMatches(typed: string | null | undefined, name: string | null | undefined, email: string | null | undefined): boolean {
  const expected = expectedConfirmation(name, email);
  if (!expected) return false;
  return nfc((typed ?? "").trim()) === expected;
}

/** "02:54" en hora de Chile. */
export function horaChile(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ts));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface Blocker {
  key: BlockKey;
  message: string;
}

/** Lista de motivos legibles (en el orden de importancia) a partir de la vista previa. */
export function buildBlockers(preview: Pick<DeletePreview, "bloqueos" | "conteos">): Blocker[] {
  const c = preview.conteos ?? {};
  const keys = new Set(preview.bloqueos ?? []);
  const out: Blocker[] = [];
  if (keys.has("no_existe")) out.push({ key: "no_existe", message: "La productora ya no existe." });
  if (keys.has("cuenta_protegida")) out.push({ key: "cuenta_protegida", message: "Es una cuenta de administración: no se puede borrar." });
  if (keys.has("con_ventas")) {
    const n = c.ventas ?? 0;
    out.push({
      key: "con_ventas",
      message: n > 0
        ? `Tiene ${plural(n, "venta registrada", "ventas registradas")} (aprobadas, reembolsadas o con contracargo): no se puede borrar, solo suspender.`
        : "Tiene ventas registradas: no se puede borrar, solo suspender.",
    });
  }
  if (keys.has("con_ventas_como_comprador")) {
    const n = c.ventas_comprador ?? 0;
    out.push({
      key: "con_ventas_como_comprador",
      message: n > 0
        ? `Tiene ${plural(n, "compra hecha como comprador", "compras hechas como comprador")} en eventos de otras productoras: borrarla borraría esa venta. Solo se puede suspender.`
        : "Tiene compras hechas como comprador en eventos de otras productoras: no se puede borrar, solo suspender.",
    });
  }
  if (keys.has("compras_pendientes")) {
    const n = c.pendientes ?? 0;
    const hora = horaChile(c.pendientes_vence_en);
    const que = n > 0 ? plural(n, "compra pendiente", "compras pendientes") : "compras pendientes";
    out.push({
      key: "compras_pendientes",
      message: `Tiene ${que}${hora ? ` que ${n === 1 ? "vence" : "vencen"} a las ${hora}` : " sin vencer"}: espera a que ${n === 1 ? "expire" : "expiren"}.`,
    });
  }
  return out;
}

/** Mensaje en español para el error que devuelve la función SQL (nombre estable de la excepción). */
export function deleteErrorMessage(raw: string | null | undefined): string {
  const m = raw ?? "";
  if (m.includes("CONFIRMATION_MISMATCH")) return "El texto de confirmación no coincide con el nombre de la productora. No se borró nada.";
  if (m.includes("HAS_SALES")) return "La productora tiene ventas (o compras como compradora): no se puede borrar, solo suspender.";
  if (m.includes("HAS_PENDING_ORDERS")) return "Hay compras pendientes sin vencer: espera a que expiren e inténtalo de nuevo.";
  if (m.includes("PROTECTED_ACCOUNT")) return "Es una cuenta de administración (o la tuya): no se puede borrar.";
  if (m.includes("ORGANIZER_NOT_FOUND")) return "No encontramos a la productora. Puede que ya se haya borrado.";
  if (m.includes("ADMIN_EMAIL_REQUIRED")) return "Falta el correo del administrador. No se borró nada.";
  if (m.includes("FORBIDDEN")) return "No tienes permiso para esta acción.";
  return "No se pudo borrar. No se cambió nada; inténtalo de nuevo.";
}

/** ¿Falta la migración (la función SQL no existe)? Para mostrar "No disponible hasta aplicar la actualización". */
export function isMissingFunctionError(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("could not find the function") || m.includes("does not exist") || m.includes("pgrst202") || m.includes("schema cache");
}

/** Convierte la respuesta cruda de la RPC en una vista previa tipada (o null si no tiene la forma esperada). */
export function parsePreview(data: unknown): DeletePreview | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.existe !== "boolean" || !Array.isArray(d.bloqueos)) return null;
  const bloqueos = d.bloqueos.filter((b): b is BlockKey => KNOWN.includes(b as BlockKey));
  return {
    existe: d.existe,
    nombre: typeof d.nombre === "string" ? d.nombre : null,
    correo_enmascarado: typeof d.correo_enmascarado === "string" ? d.correo_enmascarado : null,
    puede_borrar: d.puede_borrar === true && bloqueos.length === 0,
    bloqueos,
    conteos: (d.conteos && typeof d.conteos === "object" ? d.conteos : {}) as Partial<DeleteCounts>,
  };
}
