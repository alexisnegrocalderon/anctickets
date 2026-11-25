import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { AMBASSADOR_COOKIE, AMBASSADOR_COOKIE_MAX_AGE } from "@/lib/site";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Link de embajador: /{slug}?ref=CODIGO deja el código en una cookie por 30
  // días. Al comprar, el checkout la resuelve contra el productor del evento.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Za-z0-9_-]{3,32}$/.test(ref)) {
    response.cookies.set(AMBASSADOR_COOKIE, ref.toUpperCase(), {
      maxAge: AMBASSADOR_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/qr/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
