import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMemberships, organizations, profiles } from "@/lib/db/schema";

export type OrganizerRole = "owner" | "manager" | "staff";

export async function requireCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/dashboard");
  return session.user;
}

export async function getOrganizerAccess(slug: string) {
  const user = await requireCurrentUser();
  const [access] = await db
    .select({ organization: organizations, role: organizationMemberships.role })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(and(eq(organizations.slug, slug), eq(organizationMemberships.userId, user.id)));
  return access ? { ...access, user } : null;
}

export async function requireOrganizationManager(slug: string) {
  const access = await getOrganizerAccess(slug);
  if (!access || !["owner", "manager"].includes(access.role)) redirect("/dashboard");
  return access;
}

export async function requireAncAdmin() {
  const user = await requireCurrentUser();
  const [profile] = await db.select({ globalRole: profiles.globalRole }).from(profiles).where(eq(profiles.userId, user.id));
  if (profile?.globalRole !== "anc_admin") redirect("/dashboard");
  return user;
}
