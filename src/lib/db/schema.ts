import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const globalRole = pgEnum("global_role", ["user", "anc_admin"]);
export const membershipRole = pgEnum("membership_role", ["owner", "manager", "staff"]);
export const eventStatus = pgEnum("event_status", ["draft", "published", "cancelled"]);
export const orderStatus = pgEnum("order_status", ["pending", "approved", "rejected", "cancelled", "expired"]);
export const ticketStatus = pgEnum("ticket_status", ["valid", "used", "cancelled"]);
export const reservationStatus = pgEnum("reservation_status", ["active", "converted", "expired", "cancelled"]);
export const organizationStatus = pgEnum("organization_status", ["draft", "review", "active", "suspended"]);
export const activationRequestStatus = pgEnum("activation_request_status", ["pending", "approved", "rejected"]);
export const discountType = pgEnum("discount_type", ["percentage", "fixed"]);
export const ambassadorCommissionType = pgEnum("ambassador_commission_type", ["none", "percentage", "fixed"]);

const auditDates = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// Better Auth core schema. The names intentionally follow its canonical model mapping.
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...auditDates,
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...auditDates,
}, (table) => [index("session_user_id_idx").on(table.userId)]);

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  ...auditDates,
}, (table) => [unique("account_issuer_account_id_unique").on(table.issuer, table.accountId)]);

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...auditDates,
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  globalRole: globalRole("global_role").notNull().default("user"),
  mpConnected: boolean("mp_connected").notNull().default(false),
  ...auditDates,
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: organizationStatus("status").notNull().default("draft"),
  description: text("description"),
  logoUrl: text("logo_url"),
  supportEmail: text("support_email"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  websiteUrl: text("website_url"),
  ...auditDates,
});

export const mpAccounts = pgTable("mp_accounts", {
  organizationId: uuid("organization_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
  mpUserId: text("mp_user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  publicKey: text("public_key"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...auditDates,
});

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: membershipRole("role").notNull(),
  ...auditDates,
}, (table) => [unique("organization_memberships_org_user_unique").on(table.organizationId, table.userId)]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category"),
  venue: text("venue"),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  imageUrl: text("image_url"),
  status: eventStatus("status").notNull().default("draft"),
  ...auditDates,
}, (table) => [index("events_organization_idx").on(table.organizationId), index("events_status_date_idx").on(table.status, table.eventDate)]);

export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
  reservedCount: integer("reserved_count").notNull().default(0),
  soldCount: integer("sold_count").notNull().default(0),
  salesStart: timestamp("sales_start", { withTimezone: true }),
  salesEnd: timestamp("sales_end", { withTimezone: true }),
  ...auditDates,
}, (table) => [check("ticket_type_capacity_non_negative", sql`${table.capacity} >= 0`), check("ticket_type_counts_non_negative", sql`${table.reservedCount} >= 0 and ${table.soldCount} >= 0`), index("ticket_types_event_idx").on(table.eventId)]);

export const eventStaff = pgTable("event_staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canScan: boolean("can_scan").notNull().default(true),
  grantedBy: text("granted_by").notNull().references(() => users.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...auditDates,
}, (table) => [unique("event_staff_event_user_unique").on(table.eventId, table.userId), index("event_staff_user_idx").on(table.userId)]);

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: text("buyer_id").notNull().references(() => users.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  status: reservationStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...auditDates,
}, (table) => [index("reservations_event_status_idx").on(table.eventId, table.status), index("reservations_expiry_idx").on(table.expiresAt)]);

export const reservationItems = pgTable("reservation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  ticketTypeId: uuid("ticket_type_id").notNull().references(() => ticketTypes.id),
  quantity: integer("quantity").notNull(),
  unitBasePrice: numeric("unit_base_price", { precision: 12, scale: 2 }).notNull(),
  ...auditDates,
}, (table) => [check("reservation_item_quantity_positive", sql`${table.quantity} > 0`), unique("reservation_items_reservation_ticket_type_unique").on(table.reservationId, table.ticketTypeId)]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: text("buyer_id").notNull().references(() => users.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  reservationId: uuid("reservation_id").unique().references(() => reservations.id),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  serviceFeeAmount: numeric("service_fee_amount", { precision: 12, scale: 2 }).notNull(),
  mpFeeAmount: numeric("mp_fee_amount", { precision: 12, scale: 2 }).notNull(),
  ancFeeAmount: numeric("anc_fee_amount", { precision: 12, scale: 2 }).notNull(),
  mpPreferenceId: text("mp_preference_id").unique(),
  mpPaymentId: text("mp_payment_id").unique(),
  status: orderStatus("status").notNull().default("pending"),
  buyerEmail: text("buyer_email").notNull(),
  ...auditDates,
}, (table) => [index("orders_buyer_idx").on(table.buyerId), index("orders_event_idx").on(table.eventId)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  ticketTypeId: uuid("ticket_type_id").notNull().references(() => ticketTypes.id),
  quantity: integer("quantity").notNull(),
  unitBasePrice: numeric("unit_base_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("order_item_quantity_positive", sql`${table.quantity} > 0`)]);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  ticketTypeId: uuid("ticket_type_id").notNull().references(() => ticketTypes.id),
  qrCode: uuid("qr_code").notNull().unique().defaultRandom(),
  status: ticketStatus("status").notNull().default("valid"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("tickets_order_idx").on(table.orderId)]);

export const ticketCheckins = pgTable("ticket_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  staffUserId: text("staff_user_id").notNull().references(() => users.id),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  result: text("result").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => [index("ticket_checkins_event_idx").on(table.eventId), index("ticket_checkins_ticket_idx").on(table.ticketId)]);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  externalEventId: text("external_event_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("payment_events_provider_external_unique").on(table.provider, table.externalEventId)]);

export const organizationActivationRequests = pgTable("organization_activation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull().references(() => users.id),
  status: activationRequestStatus("status").notNull().default("pending"),
  note: text("note"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...auditDates,
});

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  internalName: text("internal_name").notNull(),
  type: discountType("type").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  maxPerBuyer: integer("max_per_buyer").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...auditDates,
}, (table) => [unique("discount_codes_event_code_unique").on(table.eventId, table.code), index("discount_codes_event_idx").on(table.eventId)]);

export const ambassadors = pgTable("ambassadors", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  code: text("code").notNull(),
  commissionType: ambassadorCommissionType("commission_type").notNull().default("none"),
  commissionValue: numeric("commission_value", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...auditDates,
}, (table) => [unique("ambassadors_event_code_unique").on(table.eventId, table.code), index("ambassadors_event_idx").on(table.eventId)]);

export const discountCodeRedemptions = pgTable("discount_code_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  discountCodeId: uuid("discount_code_id").notNull().references(() => discountCodes.id),
  orderId: uuid("order_id").notNull().unique().references(() => orders.id),
  buyerId: text("buyer_id").notNull().references(() => users.id),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("discount_redemptions_code_buyer_idx").on(table.discountCodeId, table.buyerId)]);

export const ambassadorAttributions = pgTable("ambassador_attributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadors.id),
  orderId: uuid("order_id").notNull().unique().references(() => orders.id),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("ambassador_attributions_ambassador_idx").on(table.ambassadorId)]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before").notNull().default({}),
  after: jsonb("after").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_log_org_created_idx").on(table.organizationId, table.createdAt), index("audit_log_entity_idx").on(table.entityType, table.entityId)]);
