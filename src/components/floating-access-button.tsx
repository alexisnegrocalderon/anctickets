"use client";

/** ANC: CTA flotante glassmorphism que lleva a la sección de entradas. */
export default function FloatingAccessButton() {
  function scrollToTickets() {
    document.getElementById("entradas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4" aria-hidden="false">
      <button
        type="button"
        onClick={scrollToTickets}
        data-cursor-hover
        className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_8px_40px_-8px_rgba(167,127,255,.65)] backdrop-blur-xl transition hover:border-[#c3adff]/60 hover:bg-white/15 active:scale-[.97]"
      >
        Quiero mi acceso
        <span className="transition group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
}
