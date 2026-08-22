import { NextResponse } from "next/server";

/** La conexión heredada por usuario queda deshabilitada; la conexión válida será por organización en Neon. */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
