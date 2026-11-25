import { redirect } from "next/navigation";
import { getClaimsUser, getOrganizerProfile } from "@/lib/auth";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge, Button, Card, LinkButton, PageHeader } from "@/components/dashboard/ui";

export default async function DashboardAccountPage() {
  const user = await getClaimsUser();
  if (!user) redirect("/login?next=/dashboard/account");

  const profile = await getOrganizerProfile(user.id);

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

        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
