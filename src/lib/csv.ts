/**
 * Escapa un valor para CSV y neutraliza la inyección de fórmulas: si empieza
 * con = + - @ (o tab/CR) Excel/Sheets lo ejecutaría como fórmula, así que se
 * antepone un apóstrofo.
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(",");
}
