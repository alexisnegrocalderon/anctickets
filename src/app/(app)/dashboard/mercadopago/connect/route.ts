import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMpAuthorizeUrl } from "@/lib/mercadopago";

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

  return NextResponse.redirect(getMpAuthorizeUrl(user.id));
}
