import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeMpOAuthCode } from "@/lib/mercadopago";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  if (!code || !state) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/events?mp_error=missing_code`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/dashboard/events?mp_error=state`);
  }

  try {
    const tokenResponse = await exchangeMpOAuthCode(code);
    const admin = createAdminClient();

    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000
    ).toISOString();

    const { error: upsertError } = await admin.from("mp_accounts").upsert({
      organizer_id: user.id,
      mp_user_id: String(tokenResponse.user_id),
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      public_key: tokenResponse.public_key,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) throw new Error(upsertError.message);

    const { error: profileError } = await admin
      .from("profiles")
      .update({ mp_connected: true })
      .eq("id", user.id);

    if (profileError) throw new Error(profileError.message);

    return NextResponse.redirect(
      `${siteUrl}/dashboard/events?mp_connected=1`
    );
  } catch (err) {
    console.error("Mercado Pago OAuth callback error:", err);
    return NextResponse.redirect(`${siteUrl}/dashboard/events?mp_error=1`);
  }
}
