"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ambassadors, auditLog, discountCodes, events, eventStaff, organizationActivationRequests, organizationMemberships, organizations, ticketTypes, users } from "@/lib/db/schema";
import { requireCurrentUser, requireOrganizationManager } from "@/lib/organizer";

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 56);
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function recordAudit(organizationId: string, actorUserId: string, entityType: string, entityId: string, action: string, after: Record<string, unknown>) {
  await db.insert(auditLog).values({ organizationId, actorUserId, entityType, entityId, action, after });
}

export async function createOrganization(formData: FormData) {
  const user = await requireCurrentUser();
  const name = text(formData, "name");
  const contactPhone = text(formData, "contactPhone");
  if (name.length < 2) throw new Error("El nombre de la organización es obligatorio.");
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
  const [organization] = await db.insert(organizations).values({ name, slug, contactName: user.name, supportEmail: user.email, contactPhone }).returning();
  await db.insert(organizationMemberships).values({ organizationId: organization.id, userId: user.id, role: "owner" });
  await recordAudit(organization.id, user.id, "organization", organization.id, "created", { status: "draft" });
  redirect(`/dashboard/organizer/${organization.slug}`);
}

export async function requestOrganizationActivation(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  await db.insert(organizationActivationRequests).values({ organizationId: organization.id, requestedBy: user.id, status: "pending" }).onConflictDoUpdate({ target: organizationActivationRequests.organizationId, set: { status: "pending", requestedBy: user.id, updatedAt: new Date() } });
  await db.update(organizations).set({ status: "review", updatedAt: new Date() }).where(eq(organizations.id, organization.id));
  await recordAudit(organization.id, user.id, "organization", organization.id, "activation_requested", { status: "review" });
  revalidatePath(`/dashboard/organizer/${slug}`);
}

export async function updateOrganizationProfile(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const values = { description: text(formData, "description") || null, logoUrl: text(formData, "logoUrl") || null, supportEmail: text(formData, "supportEmail") || null, contactName: text(formData, "contactName") || null, contactPhone: text(formData, "contactPhone") || null, websiteUrl: text(formData, "websiteUrl") || null, updatedAt: new Date() };
  await db.update(organizations).set(values).where(eq(organizations.id, organization.id));
  await recordAudit(organization.id, user.id, "organization", organization.id, "profile_updated", values);
  revalidatePath(`/dashboard/organizer/${slug}/profile`);
}

export async function createOrganizerEvent(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const title = text(formData, "title");
  const eventDate = text(formData, "eventDate");
  if (!title || !eventDate) throw new Error("Título y fecha son obligatorios.");
  const eventSlug = `${organization.slug}-${slugify(title)}-${Date.now().toString().slice(-5)}`;
  const [event] = await db.insert(events).values({ organizationId: organization.id, title, slug: eventSlug, eventDate: new Date(eventDate), venue: text(formData, "venue") || null, category: text(formData, "category") || null, description: text(formData, "description") || null }).returning();
  await recordAudit(organization.id, user.id, "event", event.id, "created", { status: "draft" });
  revalidatePath(`/dashboard/organizer/${slug}/events`);
}

export async function createImmersiveEvent(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const title = text(formData, "title");
  const eventDate = text(formData, "eventDate");
  const accessMode = text(formData, "accessMode");
  const saleMode = text(formData, "saleMode");
  if (!title || !eventDate || !accessMode) throw new Error("Completa los momentos esenciales para guardar el evento.");
  const price = (name: string) => {
    const value = Number(text(formData, name));
    if (!Number.isFinite(value) || value <= 0) throw new Error("Las entradas deben tener un valor mayor que cero.");
    return value.toFixed(2);
  };
  const capacity = (name: string) => {
    const value = Number(text(formData, name));
    if (!Number.isInteger(value) || value <= 0) throw new Error("Define cupos positivos para cada entrada.");
    return value;
  };
  const salesStart = saleMode === "scheduled" ? new Date(text(formData, "salesStart")) : new Date();
  if (Number.isNaN(salesStart.getTime())) throw new Error("Define cuándo se abren las ventas.");
  const eventSlug = `${organization.slug}-${slugify(title)}-${Date.now().toString().slice(-5)}`;
  const [event] = await db.insert(events).values({ organizationId: organization.id, title, slug: eventSlug, eventDate: new Date(eventDate), venue: text(formData, "venue") || null, category: text(formData, "category") || null, description: text(formData, "description") || null, imageUrl: text(formData, "imageUrl") || null }).returning();
  const rows = accessMode === "presale"
    ? [{ eventId: event.id, name: "Preventa", basePrice: price("presalePrice"), capacity: capacity("presaleCapacity"), salesStart }, { eventId: event.id, name: "General", basePrice: price("generalPrice"), capacity: capacity("generalCapacity"), salesStart }]
    : [{ eventId: event.id, name: text(formData, "ticketName") || "Entrada general", basePrice: price("ticketPrice"), capacity: capacity("ticketCapacity"), salesStart }];
  await db.insert(ticketTypes).values(rows);
  await recordAudit(organization.id, user.id, "event", event.id, "immersive_draft_created", { accessMode, saleMode, ticketTypes: rows.length });
  redirect(`/dashboard/organizer/${slug}/events`);
}

export async function createDiscountCode(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const eventId = text(formData, "eventId");
  const code = text(formData, "code").toUpperCase();
  const type = text(formData, "type") === "fixed" ? "fixed" : "percentage";
  const value = text(formData, "value");
  if (!eventId || !code || Number(value) < 0) throw new Error("Completa los datos del descuento.");
  if (type === "percentage" && Number(value) >= 100) throw new Error("Los descuentos del 100% se gestionan como accesos especiales con cupos y comisión adicional.");
  const [discount] = await db.insert(discountCodes).values({ eventId, code, internalName: text(formData, "internalName") || code, type, value, maxRedemptions: text(formData, "maxRedemptions") ? Number(text(formData, "maxRedemptions")) : null, maxPerBuyer: Number(text(formData, "maxPerBuyer") || "1"), createdBy: user.id }).returning();
  await recordAudit(organization.id, user.id, "discount_code", discount.id, "created", { code, type, value });
  revalidatePath(`/dashboard/organizer/${slug}/promotions`);
}

export async function createAmbassador(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const eventId = text(formData, "eventId");
  const name = text(formData, "name");
  const code = text(formData, "code").toUpperCase();
  const commissionType = ["none", "percentage", "fixed"].includes(text(formData, "commissionType")) ? text(formData, "commissionType") as "none" | "percentage" | "fixed" : "none";
  if (!eventId || !name || !code) throw new Error("Completa los datos del embajador.");
  const [ambassador] = await db.insert(ambassadors).values({ eventId, name, email: text(formData, "email") || null, code, commissionType, commissionValue: text(formData, "commissionValue") || "0", createdBy: user.id }).returning();
  await recordAudit(organization.id, user.id, "ambassador", ambassador.id, "created", { name, code, commissionType });
  revalidatePath(`/dashboard/organizer/${slug}/ambassadors`);
}

export async function inviteEventStaff(formData: FormData) {
  const slug = text(formData, "slug");
  const { organization, user } = await requireOrganizationManager(slug);
  const email = text(formData, "email").toLowerCase();
  const eventId = text(formData, "eventId");
  const [staffUser] = await db.select().from(users).where(eq(users.email, email));
  if (!staffUser) throw new Error("El staff debe crear su cuenta ANC Tickets antes de ser asignado.");
  await db.insert(eventStaff).values({ eventId, userId: staffUser.id, grantedBy: user.id, canScan: true }).onConflictDoUpdate({ target: [eventStaff.eventId, eventStaff.userId], set: { canScan: true, revokedAt: null, updatedAt: new Date() } });
  await recordAudit(organization.id, user.id, "event_staff", `${eventId}:${staffUser.id}`, "granted", { email });
  revalidatePath(`/dashboard/organizer/${slug}/staff`);
}
