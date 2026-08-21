import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f4f1]">
      <section className="relative isolate min-h-[82vh] overflow-hidden border-b border-white/10 px-5 py-7 sm:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_32%,#9b6cff_0%,#28164b_23%,#090909_58%)] opacity-70" />
        <div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "radial-gradient(#f5f4f1 0.65px, transparent 0.65px)", backgroundSize: "5px 5px" }} />
        <nav className="mx-auto flex max-w-7xl items-center justify-between"><span className="text-lg font-black italic tracking-[-.08em]">ANC<br />TICKETS</span><Link href="/login" className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold tracking-[.14em] transition hover:border-[#b695ff] hover:text-[#b695ff]">INGRESAR</Link></nav>
        <div className="mx-auto flex min-h-[66vh] max-w-7xl flex-col justify-end pb-10"><p className="text-xs font-bold tracking-[.28em] text-[#c3adff]">CHILE / EVENTOS EN VIVO</p><h1 className="mt-5 max-w-4xl text-6xl font-black leading-[.82] tracking-[-.09em] sm:text-8xl lg:text-9xl">TU NOCHE<br /><span className="text-[#a77fff]">EMPIEZA</span> AQUÍ.</h1><div className="mt-10 flex flex-wrap items-center gap-4"><Link href="/login" className="rounded-xl bg-[#a77fff] px-5 py-3 text-sm font-black text-black transition hover:bg-[#c6b0ff]">CREAR MI EVENTO →</Link><p className="max-w-xs text-sm leading-6 text-neutral-300">Una plataforma para crear, vender y controlar el acceso a experiencias reales.</p></div></div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3"><article className="bg-[#090909] p-7"><p className="text-xs font-bold tracking-[.2em] text-[#a77fff]">01 / PRODUCTORES</p><h2 className="mt-4 text-2xl font-black tracking-[-.05em]">Crea la noche<br />sin formularios.</h2><p className="mt-4 text-sm leading-6 text-neutral-400">Seis decisiones guiadas, borrador automático y un preview vivo de tu evento.</p></article><article className="bg-[#090909] p-7"><p className="text-xs font-bold tracking-[.2em] text-[#a77fff]">02 / PÚBLICO</p><h2 className="mt-4 text-2xl font-black tracking-[-.05em]">Accede con<br />una entrada clara.</h2><p className="mt-4 text-sm leading-6 text-neutral-400">Compra, QR y tu entrada en un solo recorrido pensado para móvil.</p></article><article className="bg-[#090909] p-7"><p className="text-xs font-bold tracking-[.2em] text-[#a77fff]">03 / PUERTA</p><h2 className="mt-4 text-2xl font-black tracking-[-.05em]">Control en<br />tiempo real.</h2><p className="mt-4 text-sm leading-6 text-neutral-400">Staff por evento, validación atómica y protección contra dobles ingresos.</p></article></section>
    </main>
  );
}
