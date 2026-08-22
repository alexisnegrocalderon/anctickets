import Image from "next/image";
import type { Event, TicketType } from "@/lib/database.types";
import BuyForm from "@/app/(app)/events/[id]/buy-form";
import FloatingAccessButton from "@/components/floating-access-button";
import HomeMotionEffects from "@/components/home-motion-effects";

export default function EventPublicView({
  event,
  ticketTypes,
  isLoggedIn,
  organizerName,
}: {
  event: Event;
  ticketTypes: TicketType[] | null;
  isLoggedIn: boolean;
  organizerName: string | null;
}) {
  const date = new Date(event.event_date);
  const day = date.toLocaleDateString("es-CL", { day: "2-digit" });
  const month = date.toLocaleDateString("es-CL", { month: "short" }).replace(".", "").toUpperCase();
  const time = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const hasTickets = !!ticketTypes && ticketTypes.length > 0;

  return (
    <main className="min-h-screen bg-[#090909] pb-28 text-[#f5f4f1]">
      <HomeMotionEffects />

      {/* Flyer */}
      <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundColor: "#090909",
              backgroundImage:
                "radial-gradient(circle at 82% 10%, rgba(167,127,255,.5), transparent 42%), radial-gradient(circle at 20% 90%, rgba(167,127,255,.2), transparent 40%), linear-gradient(135deg, #0d0d0f 0%, #090909 55%, #120c1c 100%)",
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,#090909_0%,rgba(9,9,9,.35)_45%,rgba(9,9,9,.15)_100%)]" />
      </div>

      {/* Tarjeta stub */}
      <div className="relative z-10 mx-4 -mt-20 sm:mx-auto sm:-mt-24 sm:max-w-2xl">
        <div data-anc-reveal className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#a77fff] to-[#7c5cd6] px-5 py-3">
            <span className="flex items-center gap-1.5 text-sm font-black italic tracking-tight text-[#120d1b]">
              <Image src="/anc-mark.png" alt="" width={18} height={18} />
              ANC<span className="opacity-70">TICKETS</span>
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#120d1b]/70">
              Acceso oficial
            </span>
          </div>

          <div className="relative border-b border-dashed border-white/15">
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#090909]" />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#090909]" />
          </div>

          <div className="p-6 sm:p-8">
            {organizerName ? (
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-500">
                Una producción de <span className="text-[#f5f4f1]">{organizerName}</span>
              </p>
            ) : null}
            {event.venue ? (
              <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a77fff]">
                {event.venue}
              </p>
            ) : null}
            <h1 className="mt-2 text-[clamp(2rem,7vw,3.2rem)] font-black leading-[.92] tracking-[-.03em] text-[#f5f4f1]">
              {event.title}
            </h1>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:w-fit sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-500">Fecha</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-[#f5f4f1]">
                  {day} <span className="text-[#c3adff]">{month}</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-500">Hora</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-[#f5f4f1]">{time}</p>
              </div>
            </div>
          </div>
        </div>

        {event.description ? (
          <p data-anc-reveal className="mt-8 whitespace-pre-line text-[15px] leading-7 text-neutral-300">
            {event.description}
          </p>
        ) : null}

        <section id="entradas" data-anc-reveal className="mt-10 scroll-mt-8">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[#a77fff]">Tu acceso</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-[#f5f4f1]">Entradas</h2>

          <div className="mt-5">
            {!hasTickets ? (
              <p className="text-neutral-400">
                Este evento todavía no tiene entradas disponibles.
              </p>
            ) : (
              <BuyForm
                eventId={event.id}
                eventSlug={event.slug}
                ticketTypes={ticketTypes!}
                isLoggedIn={isLoggedIn}
              />
            )}
          </div>
        </section>
      </div>

      {hasTickets ? <FloatingAccessButton /> : null}
    </main>
  );
}
