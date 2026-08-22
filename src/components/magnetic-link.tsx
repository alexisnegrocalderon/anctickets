"use client";

/** ANC Rave Editorial Noir: pull magnético sutil hacia el cursor sobre los CTA principales. */
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

type MagneticLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export default function MagneticLink({ href, className, children }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const moveX = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const moveY = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });

    function onMove(event: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      moveX((event.clientX - (rect.left + rect.width / 2)) * 0.28);
      moveY((event.clientY - (rect.top + rect.height / 2)) * 0.28);
    }

    function onLeave() {
      moveX(0);
      moveY(0);
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <Link href={href} ref={ref} className={className} data-cursor-hover>
      {children}
    </Link>
  );
}
