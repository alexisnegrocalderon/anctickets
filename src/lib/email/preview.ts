/**
 * Vista previa: el HTML real del correo se muestra en un iframe con sandbox
 * sin scripts. Para ver el modo claro u oscuro sin depender del sistema, se
 * reemplaza la consulta de medios del correo (función pura, apta para cliente).
 */
export type PreviewScheme = "light" | "dark";

export function forcePreviewScheme(html: string, scheme: PreviewScheme): string {
  const dark = "@media (prefers-color-scheme:dark)";
  return html.split(dark).join(scheme === "dark" ? "@media all" : "@media not all");
}
