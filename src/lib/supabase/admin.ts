import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente con service role — solo para uso server-side (webhooks, rutas API
 * que necesitan leer/escribir sin las restricciones de RLS, ej. mp_accounts).
 * Nunca importar este archivo desde código que se ejecute en el browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
