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
  created_at: string;
};

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
    };
    Views: Record<string, never>;
    Functions: {
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
    };
  };
};
