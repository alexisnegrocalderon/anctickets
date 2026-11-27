import { redirect } from "next/navigation";
import { getClaimsUser, getOrganizerProfile, getSupabase, getVerifiedUser } from "@/lib/auth";
import { getAdminUser, getSessionAssurance, hasVerifiedTotpFactor } from "@/lib/admin";
import { siteUrl } from "@/lib/site";
import TeamAccessSection from "@/components/dashboard/team-access-section";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge, Button, Card, LinkButton, PageHeader } from "@/components/dashboard/ui";
import NotifySalesForm from "./notify-sales-form";
import type { NotifySales } from "@/lib/database.types";

export default async function DashboardAccountPage() {
  const user = await getClaimsUser();
  if (!user) redirect("/login?next=/dashboard/account");

  const profile = await getOrganizerProfile(user.id);
  // Verificación fuerte en el servidor: solo un admin ve el enlace.
  const admin = await getAdminUser();
  const isAdmin = !!admin;

  // Datos de la sección de acceso con clave: solo se calculan para un admin.
  let team: { hasTotp: boolean; hasPassword: boolean; viaGoogle: boolean } | null = null;
  if (admin) {
    const [{ amrMethods }, hasTotp, verified] = await Promise.all([
      getSessionAssurance(),
      hasVerifiedTotpFactor(),
      getVerifiedUser(),
    ]);
    const providers = Array.isArray(verified?.app_metadata?.providers) ? (verified.app_metadata.providers as string[]) : [];
    team = {
      hasTotp,
      hasPassword: providers.includes("email") || !!verified?.identities?.some((i) => i.provider === "email"),
      viaGoogle: amrMethods.includes("oauth"),
    };
  }

  // Preferencia de aviso de ventas (migración 0011). Si la columna aún no existe, queda en "cada venta".
  const supabase = await getSupabase();
  const { data: prefRow } = await supabase.from("profiles").select("notify_sales").eq("id", user.id).maybeSingle();
  const notifySales = ((prefRow as { notify_sales?: NotifySales } | null)?.notify_sales ?? "each") as NotifySales;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Cuenta" />

      <div className="flex flex-col gap-4">
        <Card>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-[var(--anc-muted-text)]">
            Productora
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{profile?.organizer_name}</p>
          <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[.18em] text-[var(--anc-muted-text)]">
            Correo
          </p>
          <p className="mt-1 break-all text-base text-white">{user?.email}</p>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl uppercase text-white">Mercado Pago</h2>
              <p className="mt-1 text-sm text-[var(--anc-muted-text)]">
                {profile?.mp_connected
                  ? "Tu cuenta está conectada: cada venta cae directo en ella."
                  : "Conéctala para recibir el dinero de tus ventas directo en tu cuenta."}
              </p>
            </div>
            <Badge tone={profile?.mp_connected ? "success" : "neutral"}>
              {profile?.mp_connected ? "Conectada" : "Sin conectar"}
            </Badge>
          </div>
          {!profile?.mp_connected ? (
            <div className="mt-4">
              <LinkButton variant="primary" href="/dashboard/mercadopago/connect">
                Conectar Mercado Pago
              </LinkButton>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-2xl uppercase text-white">Avisarme de las ventas</h2>
          <p className="mt-1 text-sm text-[var(--anc-muted-text)]">
            Te escribimos a {user.email ?? "tu correo"} cuando vendes entradas. No incluye datos de contacto de tus compradores.
          </p>
          <NotifySalesForm initial={notifySales} />
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl uppercase text-white">App en tu celular</h2>
              <p className="mt-1 text-sm text-[var(--anc-muted-text)]">
                Instala ANC Tickets para abrirla como una app y escanear entradas incluso sin internet.
              </p>
            </div>
            <InstallAppButton />
          </div>
        </Card>

        {isAdmin ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl uppercase text-white">Administración</h2>
                <p className="mt-1 text-sm text-[var(--anc-muted-text)]">Productoras, ventas, comisiones y salud del sistema.</p>
              </div>
              <LinkButton href="/admin">Panel de administración</LinkButton>
            </div>
          </Card>
        ) : null}

        {admin && team ? (
          <TeamAccessSection
            email={admin.email}
            hasTotp={team.hasTotp}
            hasPassword={team.hasPassword}
            viaGoogle={team.viaGoogle}
            accessUrl={`${siteUrl()}/acceso-equipo`}
          />
        ) : null}

        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
