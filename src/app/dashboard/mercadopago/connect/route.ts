import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMpAuthorizeUrl } from "@/lib/mercadopago";
import { MP_OAUTH_STATE_COOKIE } from "@/lib/site";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/dashboard/events", process.env.NEXT_PUBLIC_SITE_URL)
    );
  }

  // El `state` es un nonce aleatorio de un solo uso. Se guarda en una cookie
  // httpOnly junto al id del usuario y el callback exige que ambos coincidan:
  // así nadie puede conectar su cuenta de MP a la sesión de otra persona.
  const nonce = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(getMpAuthorizeUrl(nonce));
  response.cookies.set(MP_OAUTH_STATE_COOKIE, `${nonce}.${user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/mercadopago",
    maxAge: 60 * 10,
  });
  return response;
}
