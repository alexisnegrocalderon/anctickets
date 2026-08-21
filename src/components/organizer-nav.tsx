import Link from "next/link";

const tabs = [
  ["Resumen", ""],
  ["Eventos", "/events"],
  ["Perfil", "/profile"],
  ["Promociones", "/promotions"],
  ["Embajadores", "/ambassadors"],
  ["Staff", "/staff"],
] as const;

export default function OrganizerNav({ slug }: { slug: string }) {
  const root = `/dashboard/organizer/${slug}`;
  return <nav className="mb-7 flex flex-wrap gap-2" aria-label="Navegación de organizador">
    {tabs.map(([label, suffix]) => <Link key={label} href={`${root}${suffix}`} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950">{label}</Link>)}
  </nav>;
}
