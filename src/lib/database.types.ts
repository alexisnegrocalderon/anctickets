export type EventStatus = "draft" | "published" | "cancelled";
export type OrderStatus = "pending" | "approved" | "rejected" | "cancelled";
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
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_base_price: number;
  created_at: string;
};

export type Ticket = {
  id: string;
  order_id: string;
  ticket_type_id: string;
  qr_code: string;
  status: TicketStatus;
  used_at: string | null;
  created_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
