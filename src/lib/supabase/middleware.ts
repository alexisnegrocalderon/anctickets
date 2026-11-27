import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractAmrMethods, isWeakAdminSession } from "@/lib/admin-core";

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
  const { data } = await supabase.auth.getClaims();

  // Seguro de defensa en profundidad: una sesión de un correo admin que no sea
  // de Google ni aal2 (clave sola) no debe existir con el ingreso de un solo
  // paso. Si aparece, se revoca y se limpian sus cookies, y la petición (página,
  // acción o API) no sigue. Cubre /dashboard, /api y las server actions.
  const claims = data?.claims;
  if (
    claims &&
    isWeakAdminSession({
      email: typeof claims.email === "string" ? claims.email : null,
      amrMethods: extractAmrMethods(claims.amr),
      aal: typeof claims.aal === "string" ? claims.aal : null,
    })
  ) {
    await supabase.auth.signOut({ scope: "local" }); // revoca y deja las cookies de borrado en supabaseResponse
    const path = request.nextUrl.pathname;
    const blocked = path.startsWith("/api/")
      ? NextResponse.json({ error: "Sesión no válida." }, { status: 401 })
      : NextResponse.redirect(new URL("/acceso-equipo", request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
    return blocked;
  }

  return supabaseResponse;
}
