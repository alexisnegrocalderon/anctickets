"use client";

import { useEffect, useRef, useState } from "react";

interface ScanResult {
  valid: boolean;
  message: string;
}

export default function ScannerClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checking, setChecking] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !containerRef.current) return;

      scanner = new Html5Qrcode(containerRef.current.id);

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (processingRef.current) return;
            processingRef.current = true;
            setChecking(true);

            try {
              const res = await fetch("/api/tickets/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: decodedText }),
              });
              const data = await res.json();
              setResult({
                valid: !!data.valid,
                message: data.message ?? data.error ?? "Resultado desconocido",
              });
            } catch {
              setResult({ valid: false, message: "Error validando la entrada" });
            } finally {
              setChecking(false);
              setTimeout(() => {
                processingRef.current = false;
              }, 1500);
            }
          },
          undefined
        );
      } catch (err) {
        console.error("No se pudo iniciar la cámara", err);
      }
    }

    start();

    return () => {
      cancelled = true;
      scanner?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        id="qr-scanner"
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-white/15 bg-black [&_video]:w-full [&_video]:object-cover"
      />

      <div
        className={`rounded-xl px-4 py-4 text-center text-base font-semibold transition ${
          checking
            ? "bg-white/10 text-neutral-300"
            : result
              ? result.valid
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-red-500/15 text-red-300"
              : "bg-white/5 text-neutral-400"
        }`}
      >
        {checking ? "Validando..." : result ? result.message : "Apunta la cámara al código QR de la entrada"}
      </div>
    </div>
  );
}
