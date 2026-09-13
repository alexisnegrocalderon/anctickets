/**
 * ANC Tickets — Muro de Afiches.
 * El muro de la ciudad donde se pegan los afiches de fiesta: la fecha del
 * productor es el afiche que quedó encima. Dirección y contrato en
 * .impeccable/surfaces/src-app-page-tsx.md
 */
import Image from "next/image";
import Link from "next/link";
import PasteReveal from "@/components/paste-reveal";
import PosterSignup from "@/components/poster-signup";
import TearPoster from "@/components/tear-poster";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

const heroVideo = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/GbHXpGORdFcoZgeV.mp4";
const heroPoster = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";

/* Cada tinta trae su propio par de contrastes: el texto de afiche nunca se
   imprime en un color que se pierda contra su papel. */
const pasos = [
  {
    titulo: "Arma la fecha",
    detalle: "Nombre, día, lugar, tipos de entrada. Se guarda sola mientras la escribes.",
    tinta: "ink-magenta",
    titular: "#ece7dc",
    cuerpo: "#ffe3ee",
    rot: "-1.6deg",
  },
  {
    titulo: "Conecta Mercado Pago",
    detalle: "La cuenta de tu organización, no la nuestra. Ahí es donde va a caer la plata.",
    tinta: "ink-turquoise",
    titular: "#062622",
    cuerpo: "#134a43",
    rot: "1.1deg",
  },
  {
    titulo: "Comparte y cobra",
    detalle: "Pegas el link en tu historia. Cada venta entra directo, sin esperar liquidación nuestra.",
    tinta: "ink-yellow",
    titular: "#090909",
    cuerpo: "#33301f",
    rot: "-0.8deg",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  const fechasEnElMuro = (events ?? []).slice(0, 6);

  return (
    <main className="wall-surface relative min-h-screen overflow-x-clip text-[#ece7dc]">
      <PasteReveal />

      {/* Bordes rasgados y grano: material del mundo, generado, no una imagen de stock. */}
      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
        <defs>
          <filter id="torn-edge" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.07" numOctaves="4" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="11" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="torn-edge-soft" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="3" seed="19" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ---------------- EL MURO ---------------- */}
      <section className="relative isolate min-h-[100svh] px-5 pb-16 pt-6 sm:px-8 lg:px-12">
        {/* Capas viejas: fechas ya publicadas, pegadas y despegadas. */}
        {/* El muro está vivo detrás del papel: la fiesta se ve entre los afiches. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
          style={{
            // El video muere en el muro: sin línea de corte entre sección y sección.
            WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 99%)",
            maskImage: "linear-gradient(to bottom, #000 62%, transparent 99%)",
          }}
        >
          <video
            className="absolute inset-0 h-full w-full object-cover contrast-125 saturate-[.35]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroPoster}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Velo de tinta: baja el video sin apagarlo y lo tiñe del muro. */}
          <div className="absolute inset-0 bg-[#0c0b0a]/55" />
          <div className="absolute inset-0 bg-[#ff206e]/20 mix-blend-color" />
          <span className="wall-scrap left-[4%] top-[62%] h-40 w-64 rotate-[6deg] bg-[#3a2230]" />
          <span className="wall-scrap left-[30%] top-[4%] h-52 w-44 rotate-[-4deg] bg-[#1e3330]" />
          <span className="wall-scrap bottom-[6%] right-[32%] h-36 w-52 rotate-[3deg] bg-[#33301a]" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-start justify-between gap-4">
          <Link href="/" className="poster relative inline-flex items-center gap-2 px-3 py-2" aria-label="ANC Tickets, inicio">
            <span className="sheet paper" aria-hidden="true" />
            <Image src="/anc-mark.png" alt="" width={26} height={26} priority />
            <span className="poster-type text-xl text-[#090909]">ANC Tickets</span>
          </Link>

          <Link
            href="/login"
            className="poster-type relative mt-1 border-b-2 border-[#ff206e] pb-0.5 text-lg text-[#ece7dc] transition-colors duration-100 hover:text-[#ff206e]"
          >
            Ya tengo cuenta
          </Link>
        </header>

        <div className="relative z-10 mx-auto mt-10 grid max-w-7xl items-start gap-10 lg:mt-16 lg:grid-cols-[1.35fr_.65fr] lg:gap-16">
          <div className="poster paste-in poster-peel px-6 py-10 sm:px-10 sm:py-14" style={{ "--rot": "-1.4deg" } as React.CSSProperties}>
            <span className="sheet ink-magenta paper" aria-hidden="true" />
            <span className="tape -left-6 top-8 rotate-[-24deg]" aria-hidden="true" />
            <span className="tape -right-6 bottom-10 rotate-[16deg]" aria-hidden="true" />

            <h1 className="poster-type text-[clamp(3rem,8.2vw,6.4rem)] text-[#ece7dc]">
              Vende.
              <br />
              <span className="misregister" data-ink="Cobra">
                Cobra
              </span>
              <br />
              <span className="misregister" data-ink="directo.">
                directo.
              </span>
            </h1>

            <p className="mt-7 max-w-[54ch] text-lg leading-7 text-[#ffe3ee]">
              Publica tu fecha, comparte el link y recibe cada venta en la cuenta de Mercado
              Pago de tu organización. Nosotros no tocamos tu plata.
            </p>

            <p className="stamp mt-8 rotate-[-3deg] text-2xl sm:text-3xl" style={{ color: "#2a0010" }}>
              Costo ANC $0
            </p>
          </div>

          <div className="paste-in flex justify-center lg:justify-end" data-paste-delay="160">
            <PosterSignup />
          </div>
        </div>
      </section>

      {/* Restos del muro: afiches arrancados de fechas pasadas. Material, no contenido. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[100svh] bottom-0 -z-10 overflow-hidden">
        <span className="wall-scrap left-[-3%] top-[6%] h-64 w-72 rotate-[7deg] bg-[#2a1520]" />
        <span className="wall-scrap right-[-2%] top-[22%] h-80 w-64 rotate-[-5deg] bg-[#16292a]" />
        <span className="wall-scrap left-[6%] top-[44%] h-56 w-56 rotate-[-9deg] bg-[#2b2a16]" />
        <span className="wall-scrap right-[8%] top-[62%] h-72 w-60 rotate-[4deg] bg-[#241522]" />
        <span className="wall-scrap left-[-4%] top-[80%] h-64 w-72 rotate-[-6deg] bg-[#16292a]" />
      </div>

      {/* ---------------- ARRANCAR EL AFICHE ---------------- */}
      <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="poster-type text-[clamp(2.4rem,6vw,4.6rem)] text-[#ece7dc]">
            Arranca la comisión de plataforma.
          </h2>
          <p className="mt-5 max-w-[62ch] text-lg leading-7 text-[#b9b2a4]">
            Es lo que estás pagando por vender tus propias entradas. Tira del afiche.
          </p>

          <div className="mt-12">
            <TearPoster
              top={
                <div className="poster h-full px-6 py-12 sm:px-10 sm:py-16">
                  <span className="sheet paper" aria-hidden="true" />
                  <p className="poster-type text-[clamp(2.6rem,8vw,6rem)] text-[#090909]">
                    Comisión de plataforma
                  </p>
                  <p className="mt-4 text-lg leading-7 text-[#4a4639]">
                    Un porcentaje de cada entrada que vendiste tú, para alguien que no puso
                    la fiesta.
                  </p>
                </div>
              }
              bottom={
                <div className="poster px-6 py-12 sm:px-10 sm:py-16">
                  <span className="sheet ink-magenta paper" aria-hidden="true" />
                  <p className="poster-type text-[clamp(4rem,16vw,12rem)] leading-[0.8] text-[#ece7dc]">
                    $0
                  </p>
                  <p className="mt-4 max-w-[52ch] text-lg leading-7 text-[#ffe3ee]">
                    Eso es lo que ANC te cobra por usar el sistema. El cargo por servicio lo
                    paga quien compra la entrada, y de ahí sale el procesamiento de Mercado
                    Pago.
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ---------------- EL RUTEO ---------------- */}
      <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="poster-type text-[clamp(2.4rem,6vw,4.6rem)] text-[#ece7dc]">
            Tu plata no pasa por nosotros.
          </h2>

          <ol className="mt-12 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <li className="poster paste-in flex flex-col justify-between px-6 py-8" style={{ "--rot": "-1deg" } as React.CSSProperties}>
              <span className="sheet paper" aria-hidden="true" />
              <p className="poster-type text-3xl text-[#090909]">Compra tu público</p>
              <p className="mt-4 text-base leading-6 text-[#4a4639]">
                Paga con Mercado Pago desde la página de tu evento.
              </p>
            </li>

            {/* La ruta del dinero, pintada con plantilla sobre el muro entre los dos afiches. */}
            <li aria-hidden="true" className="flex items-center justify-center py-1 sm:px-2 sm:py-0">
              <span className="poster-type rotate-90 text-5xl leading-none text-[#ff206e] sm:rotate-0">
                →
              </span>
            </li>

            <li
              className="poster paste-in flex flex-col justify-between px-6 py-8"
              style={{ "--rot": "1.2deg" } as React.CSSProperties}
              data-paste-delay="140"
            >
              <span className="sheet ink-turquoise paper" aria-hidden="true" />
              <p className="poster-type text-3xl text-[#062622]">Cae en tu cuenta</p>
              <p className="mt-4 text-base leading-6 text-[#134a43]">
                La cuenta de Mercado Pago de tu organización, la que tú conectaste.
              </p>
            </li>
          </ol>

          <p className="mt-10 max-w-[62ch] text-lg leading-7 text-[#b9b2a4]">
            No hay una cuenta intermedia de ANC donde tu dinero espere a que alguien lo
            libere. Por eso el checkout no ofrece cuotas: es la única forma de garantizar
            que recibas el 100% del valor de tu entrada.
          </p>
        </div>
      </section>

      {/* ---------------- TRES PASOS ---------------- */}
      <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="poster-type text-[clamp(2.4rem,6vw,4.6rem)] text-[#ece7dc]">
            De la idea a la venta, en una sentada.
          </h2>

          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {pasos.map((paso, index) => (
              <li
                key={paso.titulo}
                className="poster paste-in px-6 py-9"
                style={{ "--rot": paso.rot } as React.CSSProperties}
                data-paste-delay={index * 120}
              >
                <span className={`sheet paper ${paso.tinta}`} aria-hidden="true" />
                <span className="tape left-1/2 -top-3 -translate-x-1/2 rotate-[4deg]" aria-hidden="true" />
                <p className="poster-type text-[2.4rem]" style={{ color: paso.titular }}>
                  {paso.titulo}
                </p>
                <p className="mt-4 text-base leading-6" style={{ color: paso.cuerpo }}>
                  {paso.detalle}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- LA PUERTA ---------------- */}
      <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="poster-type text-[clamp(2.4rem,6vw,4.6rem)] text-[#ece7dc]">
              La puerta también es tuya.
            </h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-7 text-[#b9b2a4]">
              Cada entrada vendida sale con su QR. Tu staff escanea desde su propio teléfono
              con permisos de tu evento, y un QR ya usado no vuelve a entrar.
            </p>
          </div>

          {/* Talonario: la perforación es real, hecha con una máscara de puntos. */}
          <div className="poster paste-in relative" style={{ "--rot": "1.4deg" } as React.CSSProperties}>
            <span className="sheet paper" aria-hidden="true" />
            <div className="px-6 py-8">
              <p className="poster-type text-3xl text-[#090909]">Entrada general</p>
              <p className="mt-2 font-mono text-sm text-[#4a4639]">ANC-0001 · Válida para 1 ingreso</p>
            </div>
            <div
              className="h-px w-full bg-[#090909]/45"
              style={{
                WebkitMaskImage: "repeating-linear-gradient(to right, #000 0 8px, transparent 8px 16px)",
                maskImage: "repeating-linear-gradient(to right, #000 0 8px, transparent 8px 16px)",
              }}
              aria-hidden="true"
            />
            <div className="flex items-center gap-4 px-6 py-6">
              <span
                className="block h-16 w-16 shrink-0 bg-[#090909]"
                style={{
                  WebkitMaskImage:
                    "repeating-linear-gradient(to right, #000 0 4px, transparent 4px 8px), repeating-linear-gradient(to bottom, #000 0 4px, transparent 4px 8px)",
                  maskImage:
                    "repeating-linear-gradient(to right, #000 0 4px, transparent 4px 8px), repeating-linear-gradient(to bottom, #000 0 4px, transparent 4px 8px)",
                  WebkitMaskComposite: "source-in",
                  maskComposite: "intersect",
                }}
                aria-hidden="true"
              />
              <p className="text-sm leading-5 text-[#4a4639]">
                Se escanea una vez.
                <br />
                La segunda, la puerta avisa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FECHAS EN EL MURO ---------------- */}
      {fechasEnElMuro.length > 0 ? (
        <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="poster-type text-[clamp(2.4rem,6vw,4.6rem)] text-[#ece7dc]">
              Fechas publicadas con ANC.
            </h2>
            <ul className="mt-12 flex flex-wrap gap-6">
              {fechasEnElMuro.map((event, index) => (
                <li key={event.id}>
                  <Link
                    href={`/${event.slug}`}
                    className="poster paste-in block w-[240px] px-5 py-6 transition-transform duration-100 active:scale-[.98]"
                    style={{ "--rot": `${(index % 2 === 0 ? -1 : 1) * (1 + (index % 3) * 0.6)}deg` } as React.CSSProperties}
                    data-paste-delay={index * 90}
                  >
                    <span className="sheet paper" aria-hidden="true" />
                    <p className="font-mono text-xs uppercase tracking-[.14em] text-[#7a1d3f]">
                      {new Date(event.event_date).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="poster-type mt-2 text-2xl leading-[0.9] text-[#090909]">{event.title}</p>
                    {event.venue ? (
                      <p className="mt-2 text-sm text-[#4a4639]">{event.venue}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------- CIERRE ---------------- */}
      <section className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="poster paste-in mx-auto max-w-5xl px-6 py-14 sm:px-12 sm:py-20" style={{ "--rot": "0.8deg" } as React.CSSProperties}>
          <span className="sheet ink-yellow paper" aria-hidden="true" />
          <span className="staple left-[18%] -top-1" aria-hidden="true" />
          <span className="staple right-[18%] -top-1" aria-hidden="true" />
          <h2 className="poster-type text-[clamp(3rem,9vw,7rem)] text-[#090909]">
            Tu próxima fecha
            <br />
            se pega acá.
          </h2>
          <Link
            href="/login"
            className="poster-type mt-10 inline-block bg-[#090909] px-8 py-5 text-2xl text-[#ece7dc] transition-transform duration-100 hover:bg-[#1d1d1d] active:scale-[.98]"
          >
            Publicar mi fecha
          </Link>
        </div>
      </section>

      <footer className="relative px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-[#ece7dc]/15 pt-8 text-sm text-[#8f8877] sm:flex-row sm:items-center sm:justify-between">
          <p>ANC Tickets · Chile</p>
          <nav className="flex gap-5">
            <Link href="/privacidad" className="underline decoration-[#ff206e] decoration-2 underline-offset-4 hover:text-[#ece7dc]">
              Privacidad
            </Link>
            <Link href="/terminos" className="underline decoration-[#ff206e] decoration-2 underline-offset-4 hover:text-[#ece7dc]">
              Términos
            </Link>
          </nav>
          <p className="max-w-md text-xs leading-5 sm:text-right">
            ANC no cobra comisión de plataforma al organizador. El comprador paga un cargo
            por servicio del 10%, del que se descuenta el procesamiento de Mercado Pago.
          </p>
        </div>
      </footer>
    </main>
  );
}
