import { NextResponse } from "next/server";
import { createMpOAuthState, getMpAuthorizeUrl } from "@/lib/mercadopago";
import { requireOrganizationManager } from "@/lib/organizer";

/** La conexión de pagos se inicia siempre desde una organización activa y autorizada. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, user } = await requireOrganizationManager(slug);
  if (organization.status !== "active") {
    return NextResponse.redirect(new URL(`/dashboard/organizer/${slug}/profile?mp_error=activation_required`, request.url));
  }
  return NextResponse.redirect(getMpAuthorizeUrl(createMpOAuthState(organization.id, user.id)));
}
