import type { ReactNode } from "react";
import SiteHeader from "@/components/site-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#090909] text-[#f5f4f1]">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
