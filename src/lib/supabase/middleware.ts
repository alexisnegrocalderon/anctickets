import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca la sesión si el token está por vencer (necesario para Server
  // Components). getClaims() renueva igual y verifica la firma del JWT en el
  // propio servidor, sin la ida y vuelta de red a Supabase Auth que hace
  // getUser() en cada petición. Las decisiones de acceso (layout del panel y
  // rutas de escritura) siguen usando getUser().
  await supabase.auth.getClaims();

  return supabaseResponse;
}
