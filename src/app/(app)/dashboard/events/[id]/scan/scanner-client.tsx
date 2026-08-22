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
        className="overflow-hidden rounded-xl border border-neutral-200"
      />

      {checking ? (
        <p className="text-center text-sm text-neutral-500">Validando...</p>
      ) : result ? (
        <div
          className={`rounded-lg px-4 py-3 text-center text-sm font-semibold ${
            result.valid
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {result.message}
        </div>
      ) : (
        <p className="text-center text-sm text-neutral-500">
          Apunta la cámara al código QR de la entrada.
        </p>
      )}
    </div>
  );
}
