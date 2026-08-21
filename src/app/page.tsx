/**
 * Estilo ANC — Rave Editorial Noir: composición editorial oscura, tipografía monumental
 * y lila #a77fff como único pulso de conversión para productores de eventos.
 */
import Link from "next/link";
import AmbientSoundControl from "@/components/ambient-sound-control";
import SiteHeader from "@/components/site-header";

const heroVideo = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/GbHXpGORdFcoZgeV.mp4";
const heroPoster = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";
const braceletImage = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/ucGRmmUxeMRLDHAq.jpeg";
const ticketImage = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/sJWyjPBFsNofukrp.jpg";

const steps = [
  {
    number: "01",
    title: "CREA TU FECHA.",
    description: "Arma el evento con una secuencia visual de seis decisiones. Sin formularios eternos.",
  },
  {
    number: "02",
    title: "CONECTA MERCADO PAGO.",
    description: "Vincula la cuenta de tu organización para recibir los pagos de tus entradas.",
  },
  {
    number: "03",
    title: "VENDE Y COBRA.",
    description: "Comparte tu página, abre ventas y recibe cada pago directo en tu cuenta conectada.",
  },
];

const operationalBenefits = [
  "Página de venta pensada para móvil.",
  "Tickets QR claros para cada comprador.",
  "Staff propio con permisos por evento.",
  "Escáner de puerta que bloquea dobles ingresos.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f4f1]">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10">
        <SiteHeader overlay />

        <video
          className="absolute inset-0 -z-30 h-full w-full object-cover object-[65%_center] grayscale contrast-110 brightness-[.68]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster}
          aria-label="Multitud en una fiesta nocturna, video ambiental sin sonido"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_30%,rgba(167,127,255,.42),transparent_20%),radial-gradient(circle_at_65%_55%,rgba(167,127,255,.15),transparent_28%)] mix-blend-screen" />
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(9,9,9,.96)_0%,rgba(9,9,9,.82)_38%,rgba(9,9,9,.24)_74%,rgba(9,9,9,.42)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-2/5 bg-gradient-to-t from-[#090909] via-[#090909]/55 to-transparent" />

        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-12 pt-32 sm:px-10 sm:pb-14 lg:pb-16">
          <div className="max-w-4xl">
            <p className="text-[10px] font-black tracking-[.28em] text-[#c3adff] sm:text-xs">
              ANC TICKETS / PLATAFORMA PARA PRODUCTORES
            </p>
            <div className="mt-5 inline-flex items-center border border-[#c3adff]/45 bg-[#090909]/45 px-3 py-2 text-[10px] font-black tracking-[.18em] text-[#f5f4f1] backdrop-blur-sm sm:text-xs">
              COSTO DE PLATAFORMA <span className="ml-2 text-[#c3adff]">$0</span>
            </div>
            <h1 className="mt-6 text-[clamp(3.65rem,11vw,9.3rem)] font-black leading-[.77] tracking-[-.1em]">
              VENDE.
              <br />
              <span className="text-[#a77fff]">COBRA DIRECTO.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-neutral-100 sm:text-lg sm:leading-8">
              Crea tu evento, conecta tu cuenta de Mercado Pago y recibe el pago de tus entradas de forma directa e instantánea. Sin comisión de plataforma ANC.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#a77fff] px-5 py-3.5 text-sm font-black tracking-[-.02em] text-black transition duration-200 hover:bg-[#c6b0ff] active:scale-[.97]"
              >
                CREAR MI EVENTO SIN COSTO →
              </Link>
              <a
                href="#como-funciona"
                className="rounded-xl border border-white/40 bg-black/20 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition duration-200 hover:border-[#c3adff] hover:text-[#c3adff] active:scale-[.97]"
              >
                ASÍ FUNCIONA
              </a>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-bold tracking-[.08em] text-neutral-300 sm:text-xs">
              <span>01 / PAGO DIRECTO</span>
              <span>02 / CONTROL DE PUERTA</span>
              <span>03 / COSTO ANC $0</span>
            </div>
          </div>
        </div>
        <AmbientSoundControl />
      </section>

      <section className="border-b border-white/10 bg-[#0d0d0d] px-5 py-6 sm:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 text-xs font-bold tracking-[.14em] text-neutral-300 sm:grid-cols-3 sm:gap-8">
          <p><span className="mr-3 text-[#a77fff]">—</span>VENDE ENTRADAS DE PAGO</p>
          <p><span className="mr-3 text-[#a77fff]">—</span>COBRO DIRECTO A TU CUENTA</p>
          <p><span className="mr-3 text-[#a77fff]">—</span>OPERACIÓN HECHA PARA EVENTOS</p>
        </div>
      </section>

      <section id="productores" className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:py-32">
        <div>
          <p className="text-xs font-black tracking-[.25em] text-[#a77fff]">LA DIFERENCIA ANC</p>
          <h2 className="mt-5 text-[clamp(4.5rem,12vw,10rem)] font-black leading-[.72] tracking-[-.11em]">
            $0
            <span className="block text-[clamp(2.6rem,7vw,6.3rem)] text-[#f5f4f1]">PLATAFORMA.</span>
          </h2>
        </div>
        <div className="border-l border-[#a77fff] pl-6 sm:pl-8">
          <p className="text-2xl font-black leading-[.95] tracking-[-.06em] sm:text-3xl">
            TU FECHA NO DEBERÍA ENTREGAR EL CONTROL DE SU CAJA.
          </p>
          <p className="mt-6 max-w-md text-base leading-7 text-neutral-400">
            ANC Tickets no cobra una comisión de plataforma por tus ventas. Conecta Mercado Pago, vende desde tu propia página y recibe el pago en la cuenta de tu organización.
          </p>
          <Link href="/login" className="mt-8 inline-flex items-center text-sm font-black text-[#c3adff] transition hover:text-white">
            CONECTAR Y CREAR MI EVENTO <span className="ml-2 text-xl">↗</span>
          </Link>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-white/10 bg-[#101010] px-5 py-24 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black tracking-[.25em] text-[#a77fff]">DE LA IDEA A LA PUERTA</p>
            <h2 className="mt-4 text-5xl font-black leading-[.82] tracking-[-.09em] sm:text-7xl">
              TRES MOVIMIENTOS.<br />UNA FECHA EN VENTA.
            </h2>
          </div>
          <div className="mt-14 grid border-y border-white/10 md:grid-cols-3 md:border-l">
            {steps.map((step) => (
              <article key={step.number} className="group border-b border-white/10 px-0 py-8 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:py-3 lg:px-10">
                <p className="text-xs font-black tracking-[.2em] text-[#a77fff]">{step.number}</p>
                <h3 className="mt-12 text-3xl font-black leading-[.88] tracking-[-.06em] transition duration-200 group-hover:text-[#c3adff]">
                  {step.title}
                </h3>
                <p className="mt-5 max-w-xs text-sm leading-6 text-neutral-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid border-b border-white/10 lg:grid-cols-2">
        <div className="relative min-h-[530px] overflow-hidden">
          <img src={braceletImage} alt="Pulsera ANC Tickets de color lila" className="h-full w-full object-cover object-center contrast-125" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/70" />
          <div className="absolute bottom-7 left-7 border border-white/20 bg-black/50 px-4 py-3 text-[10px] font-black tracking-[.18em] text-white backdrop-blur-md sm:bottom-10 sm:left-10">
            CONTROL DE ACCESO / ANC
          </div>
        </div>
        <div className="flex flex-col justify-between p-8 sm:p-14 lg:p-18">
          <div>
            <p className="text-xs font-black tracking-[.25em] text-[#a77fff]">MÁS QUE UN LINK DE VENTA</p>
            <h2 className="mt-5 text-5xl font-black leading-[.82] tracking-[-.09em] sm:text-7xl">
              LA PUERTA<br />TAMBIÉN ES TUYA.
            </h2>
          </div>
          <ul className="mt-14 space-y-0 border-t border-white/15">
            {operationalBenefits.map((benefit, index) => (
              <li key={benefit} className="grid grid-cols-[38px_1fr] gap-3 border-b border-white/15 py-4 text-sm leading-6 text-neutral-300">
                <span className="font-black text-[#a77fff]">0{index + 1}</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-10 inline-flex w-fit rounded-xl bg-[#f5f4f1] px-5 py-3.5 text-sm font-black text-black transition duration-200 hover:bg-[#c6b0ff] active:scale-[.97]">
            VER MI PANEL DE PRODUCTOR →
          </Link>
        </div>
      </section>

      <section id="eventos" className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-32">
        <div>
          <p className="text-xs font-black tracking-[.25em] text-[#a77fff]">PENSADO PARA QUIEN COMPRA</p>
          <h2 className="mt-4 text-5xl font-black leading-[.83] tracking-[-.09em] sm:text-7xl">
            UNA VENTA<br />QUE SE SIENTE<br />COMO TU EVENTO.
          </h2>
          <p className="mt-7 max-w-sm text-base leading-7 text-neutral-400">
            Tu audiencia llega a una página clara, compra en pocos pasos y entra con un QR listo para la puerta.
          </p>
        </div>
        <div className="relative min-h-[470px] overflow-hidden border border-white/10 bg-[#151515] p-7 sm:p-10">
          <img src={ticketImage} alt="Ambiente nocturno de un evento" className="absolute inset-0 h-full w-full object-cover grayscale contrast-125" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
          <div className="relative flex h-full flex-col justify-end">
            <div className="max-w-sm border border-white/20 bg-[#090909]/75 p-5 backdrop-blur-md sm:p-6">
              <p className="text-[10px] font-black tracking-[.22em] text-[#c3adff]">EL RESULTADO</p>
              <p className="mt-3 text-2xl font-black leading-[.9] tracking-[-.05em]">PÁGINA DE EVENTO. PAGO. QR. PUERTA.</p>
              <p className="mt-4 text-sm leading-6 text-neutral-300">Sin pasos que distraigan a tu público de llegar a tu evento.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#a77fff] px-5 py-20 text-black sm:px-10 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="text-xs font-black tracking-[.25em]">ANC TICKETS / CHILE</p>
            <h2 className="mt-5 text-[clamp(4rem,9vw,8rem)] font-black leading-[.76] tracking-[-.11em]">
              EMPIEZA A<br />VENDER HOY.
            </h2>
          </div>
          <div>
            <p className="max-w-sm text-lg font-semibold leading-7">
              Crea tu evento, conecta Mercado Pago y mantén el control de cada venta desde el primer ticket.
            </p>
            <Link href="/login" className="mt-8 inline-flex rounded-xl bg-black px-5 py-4 text-sm font-black text-white transition duration-200 hover:bg-white hover:text-black active:scale-[.97]">
              CREAR EVENTO CON COSTO $0 →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] font-bold tracking-[.12em] text-neutral-500 sm:flex-row sm:items-end sm:justify-between">
          <span>ANC TICKETS / CHILE</span>
          <span className="max-w-lg text-left leading-5 sm:text-right">COSTO DE PLATAFORMA ANC: $0. LAS TARIFAS Y CONDICIONES DEL PROCESAMIENTO DE PAGO CORRESPONDEN A MERCADO PAGO.</span>
        </div>
      </footer>
    </main>
  );
}
