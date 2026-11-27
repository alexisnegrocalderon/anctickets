export type EventStatus = "draft" | "published" | "cancelled";
export type EventTheme = "magenta" | "yellow" | "turquoise" | "charcoal" | "custom";
export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "refunded"
  | "charged_back";
export type OrderKind = "sale" | "free" | "courtesy";
export type DiscountKind = "percent" | "fixed";
export type CheckInResult = "ok" | "already_used" | "wrong_event" | "cancelled" | "not_found";
export type TicketStatus = "valid" | "used" | "cancelled";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  organizer_name: string | null;
  mp_connected: boolean;
  /** Migración 0010: la productora está suspendida (no puede vender) desde esta fecha. */
  suspended_at: string | null;
  suspended_reason: string | null;
  /** Migración 0011: cuándo avisar de las ventas a la productora. */
  notify_sales: NotifySales;
  /** Migración 0011: último día (Chile) cuyo resumen diario ya se envió. Solo lo escribe el servidor. */
  sales_summary_on: string | null;
  created_at: string;
};

export type NotifySales = "each" | "daily" | "off";

export type MpAccount = {
  organizer_id: string;
  mp_user_id: string;
  access_token: string;
  refresh_token: string | null;
  public_key: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string | null;
  venue: string | null;
  event_date: string;
  image_url: string | null;
  status: EventStatus;
  theme: EventTheme;
  accent_color: string | null;
  organizer_logo_url: string | null;
  /** Migración 0011: textos del correo (solo texto; la validación vive en el servidor y en CHECK). */
  email_welcome: string | null;
  email_access: string | null;
  email_rules: string | null;
  email_directions: string | null;
  contact_email: string | null;
  contact_instagram: string | null;
  contact_whatsapp: string | null;
  email_use_event_image: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  base_price: number;
  quantity: number;
  sold_count: number;
  reserved_count: number;
  sales_start: string | null;
  sales_end: string | null;
  /** Pausa manual de la tanda (migración 0009). */
  paused: boolean;
  /** Migración 0011: mensaje que aparece junto a esta entrada en el correo. */
  email_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  event_id: string;
  total_amount: number;
  service_fee_amount: number;
  mp_fee_amount: number;
  anc_fee_amount: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  status: OrderStatus;
  buyer_email: string;
  kind: OrderKind;
  holder_name: string | null;
  discount_code_id: string | null;
  discount_amount: number;
  discount_use_held: boolean;
  ambassador_id: string | null;
  reserved_until: string | null;
  tickets_issued_at: string | null;
  email_sent_at: string | null;
  /** Migración 0011: reclamo del aviso de venta a la productora. */
  producer_notified_at: string | null;
  overbooked: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_base_price: number;
  unit_discount: number;
  created_at: string;
};

export type Ticket = {
  id: string;
  order_id: string;
  ticket_type_id: string;
  event_id: string;
  seq: number;
  qr_code: string;
  status: TicketStatus;
  used_at: string | null;
  holder_name: string | null;
  holder_email: string | null;
  checked_in_by: string | null;
  created_at: string;
};

export type DiscountCode = {
  id: string;
  event_id: string;
  code: string;
  kind: DiscountKind;
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  ticket_type_ids: string[] | null;
  active: boolean;
  created_at: string;
};

export type Ambassador = {
  id: string;
  organizer_id: string;
  event_id: string | null;
  name: string;
  email: string | null;
  code: string;
  commission_percent: number | null;
  active: boolean;
  created_at: string;
};

export type EventStaff = {
  id: string;
  event_id: string;
  email: string;
  user_id: string | null;
  role: string;
  created_at: string;
};

export type CheckIn = {
  id: string;
  ticket_id: string | null;
  event_id: string;
  scanned_by: string | null;
  qr_input: string | null;
  result: CheckInResult;
  created_at: string;
};

/** Respuesta de la función SQL check_in_ticket. */
export type CheckInResponse = {
  result: CheckInResult | "forbidden";
  ticket_id: string | null;
  holder_name: string | null;
  holder_email: string | null;
  ticket_type: string | null;
  used_at: string | null;
  other_event_title: string | null;
  counts: { checked_in: number; total: number } | null;
};

/** Migración 0010: registro de auditoría (solo service_role). */
export type AdminAudit = {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

/** Migración 0011: avisos de cambio o cancelación enviados a los compradores. */
export type EventNotice = {
  id: string;
  event_id: string;
  kind: "cancelled" | "changed";
  message: string;
  recipients: number;
  sent: number;
  failed: number;
  created_by: string;
  created_at: string;
};

/** Migración 0011: registro de correos de prueba (límite de uno por minuto). */
export type EmailTestLog = {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
};

/** Migración 0012: intentos de ingreso con clave, solo hashes (solo service_role). */
export type AdminLoginAttempt = {
  id: string;
  email_hash: string;
  ip_hash: string;
  ok: boolean;
  created_at: string;
};

/** Migración 0010: estado del sistema (solo service_role). */
export type SystemStatus = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

/** Fila de admin_organizers() (migración 0010). */
export type AdminOrganizerRow = {
  id: string;
  organizer_name: string | null;
  email: string | null;
  created_at: string;
  mp_connected: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  eventos_total: number;
  eventos_publicados: number;
  ordenes_aprobadas: number;
  entradas_emitidas: number;
  entradas_ingresadas: number;
  venta_base: number;
  comision_anc: number;
  ultimo_evento_en: string | null;
};

/** Fila de admin_sales_by_day() (migración 0010). */
export type AdminSalesDayRow = {
  dia: string;
  ordenes: number;
  entradas: number;
  total_cobrado: number;
  cargo_servicio: number;
  comision_anc: number;
};

/** Fila de admin_health() (migración 0010). */
export type AdminHealthRow = { clave: string; cantidad: number; detalle: string | null };

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      mp_accounts: Table<MpAccount>;
      events: Table<Event>;
      ticket_types: Table<TicketType>;
      orders: Table<Order>;
      order_items: Table<OrderItem>;
      tickets: Table<Ticket>;
      discount_codes: Table<DiscountCode>;
      ambassadors: Table<Ambassador>;
      event_staff: Table<EventStaff>;
      check_ins: Table<CheckIn>;
      admin_audit: Table<AdminAudit>;
      admin_login_attempts: Table<AdminLoginAttempt, Pick<AdminLoginAttempt, "email_hash" | "ip_hash" | "ok"> & Partial<AdminLoginAttempt>>;
      system_status: Table<SystemStatus>;
      event_notices: Table<EventNotice>;
      email_test_log: Table<EmailTestLog>;
    };
    Views: Record<string, never>;
    Functions: {
      /** Migración 0014: contadores de las puertas (solo service_role). */
      bump_entry_metric: {
        Args: { p_metric: string };
        Returns: undefined;
      };
      create_pending_order: {
        Args: {
          p_buyer_id: string;
          p_event_id: string;
          p_buyer_email: string;
          p_items: {
            ticket_type_id: string;
            quantity: number;
            unit_base_price: number;
            unit_discount: number;
          }[];
          p_discount_code_id: string | null;
          p_ambassador_id: string | null;
          p_amounts: {
            total: number;
            service_fee: number;
            mp_fee: number;
            anc_fee: number;
            discount: number;
          };
          p_kind: OrderKind;
          p_ttl_minutes?: number;
          p_holder_name?: string | null;
        };
        Returns: string;
      };
      approve_order: {
        Args: { p_order_id: string; p_payment_id: string | null };
        Returns: { newly_approved: boolean; overbooked?: boolean; status: string };
      };
      fail_order: {
        Args: { p_order_id: string; p_new_status: "rejected" | "cancelled" };
        Returns: boolean;
      };
      revert_order: {
        Args: { p_order_id: string; p_new_status: "refunded" | "charged_back" };
        Returns: { reverted: boolean; cancelled_tickets: number };
      };
      expire_stale_orders: { Args: Record<string, never>; Returns: number };
      can_scan_event: {
        Args: { p_event_id: string; p_user_id: string };
        Returns: boolean;
      };
      check_in_ticket: {
        Args: { p_qr: string; p_event_id: string; p_user_id: string };
        Returns: CheckInResponse;
      };
      keep_alive: { Args: Record<string, never>; Returns: number };
      admin_organizers: { Args: Record<string, never>; Returns: AdminOrganizerRow[] };
      admin_sales_by_day: { Args: { p_days: number }; Returns: AdminSalesDayRow[] };
      admin_health: { Args: Record<string, never>; Returns: AdminHealthRow[] };
      admin_set_suspension: {
        Args: { p_organizer_id: string; p_suspend: boolean; p_reason: string | null; p_admin_email: string };
        Returns: { changed: boolean; suspended_at: string | null };
      };
      /** Migración 0013. La forma exacta está en DeletePreview (lib/admin-delete). */
      admin_organizer_delete_preview: {
        Args: { p_organizer_id: string; p_protected_emails: string[] };
        Returns: Record<string, unknown>;
      };
      admin_delete_organizer: {
        Args: { p_organizer_id: string; p_confirm: string; p_admin_email: string; p_protected_emails: string[] };
        Returns: {
          borrada: boolean;
          nombre: string | null;
          eventos: number;
          tandas: number;
          codigos: number;
          embajadores: number;
          staff: number;
          ordenes_borradas: number;
          tenia_mercado_pago: boolean;
        };
      };
    };
  };
};
