import AssetPlaceholder from "@/components/asset-placeholder";

/** ANC — grilla densa de capacidades del producto, al estilo "playbook" de agencia. */
export default function PlaybookGrid({
  items,
}: {
  items: { label: string; spec: string; title: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {items.map((item, index) => (
        <div key={item.title} className="reveal" data-reveal-delay={index * 70}>
          <AssetPlaceholder label={item.label} spec={item.spec} ratio="4/5" className="rounded-xl" />
          <p className="mt-3 text-sm font-black leading-5 text-[var(--anc-ink)]">{item.title}</p>
        </div>
      ))}
    </div>
  );
}
