import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, mpAccounts, organizationMemberships, organizations } from "@/lib/db/schema";
import { exchangeMpOAuthCode, verifyMpOAuthState } from "@/lib/mercadopago";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  if (!code || !state) return NextResponse.redirect(`${siteUrl}/dashboard?mp_error=missing_code`);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(`${siteUrl}/login?next=/dashboard`);

  const stateValue = verifyMpOAuthState(state);
  if (!stateValue || stateValue.userId !== session.user.id) return NextResponse.redirect(`${siteUrl}/dashboard?mp_error=state`);

  const [access] = await db
    .select({ organization: organizations, role: organizationMemberships.role })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(and(eq(organizations.id, stateValue.organizationId), eq(organizationMemberships.userId, session.user.id)));

  if (!access || !["owner", "manager"].includes(access.role) || access.organization.status !== "active") {
    return NextResponse.redirect(`${siteUrl}/dashboard?mp_error=unauthorized`);
  }

  try {
    const tokenResponse = await exchangeMpOAuthCode(code);
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    await db.insert(mpAccounts).values({ organizationId: access.organization.id, mpUserId: String(tokenResponse.user_id), accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token, publicKey: tokenResponse.public_key, expiresAt, updatedAt: new Date() }).onConflictDoUpdate({ target: mpAccounts.organizationId, set: { mpUserId: String(tokenResponse.user_id), accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token, publicKey: tokenResponse.public_key, expiresAt, updatedAt: new Date() } });
    await db.insert(auditLog).values({ organizationId: access.organization.id, actorUserId: session.user.id, entityType: "mp_account", entityId: access.organization.id, action: "mercadopago_connected", after: { mpUserId: String(tokenResponse.user_id), expiresAt: expiresAt.toISOString() } });
    return NextResponse.redirect(`${siteUrl}/dashboard/organizer/${access.organization.slug}/profile?mp_connected=1`);
  } catch (error) {
    console.error("Mercado Pago OAuth callback error:", error);
    return NextResponse.redirect(`${siteUrl}/dashboard/organizer/${access.organization.slug}/profile?mp_error=1`);
  }
}
