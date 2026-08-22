"use client";

/**
 * Estilo ANC — Rave Editorial Noir: simulaciones operativas concretas, sin métricas ni reseñas ficticias.
 * Las interacciones convierten la promesa comercial en una demostración clara del producto.
 */
import { useState } from "react";

const saleStages = [
  { label: "01", name: "CONFIGURA", detail: "Define fecha, entradas con valor y la identidad de tu evento." },
  { label: "02", name: "CONECTA", detail: "Vincula la cuenta de Mercado Pago de tu organización." },
  { label: "03", name: "PUBLICA", detail: "Comparte una página de venta preparada para tu audiencia." },
  { label: "04", name: "VALIDA", detail: "Tu staff escanea QR y registra cada ingreso en puerta." },
];

export default function ProductInteractions() {
  const [activeStage, setActiveStage] = useState(0);
  const [paymentState, setPaymentState] = useState<"idle" | "connected">("idle");
  const [qrState, setQrState] = useState<"idle" | "valid">("idle");

  return (
    <section className="anc-product-lab" aria-labelledby="lab-title">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-10 lg:py-32">
        <div data-anc-reveal className="max-w-3xl">
          <p className="text-xs font-black tracking-[.25em] text-[#a77fff]">PRUEBA EL FLUJO</p>
          <h2 id="lab-title" className="mt-4 text-5xl font-black leading-[.8] tracking-[-.09em] sm:text-7xl">NO SOLO TE LO DECIMOS.<br />ASÍ SE MUEVE ANC.</h2>
        </div>

        <div className="anc-lab-grid" data-anc-reveal>
          <article className="anc-lab-card anc-lab-card-flow">
            <div className="anc-lab-card-head"><span>01 / RUTA DE VENTA</span><i /></div>
            <div className="anc-flow-layout">
              <div className="anc-flow-controls" role="tablist" aria-label="Etapas de una venta ANC">
                {saleStages.map((stage, index) => (
                  <button
                    key={stage.name}
                    type="button"
                    role="tab"
                    aria-selected={activeStage === index}
                    className={activeStage === index ? "is-active" : ""}
                    onClick={() => setActiveStage(index)}
                  >
                    <span>{stage.label}</span>{stage.name}
                  </button>
                ))}
              </div>
              <div className="anc-flow-screen" role="tabpanel">
                <p className="anc-system-label">MOMENTO ACTUAL / {saleStages[activeStage].label}</p>
                <h3>{saleStages[activeStage].name}</h3>
                <p>{saleStages[activeStage].detail}</p>
                <div className="anc-flow-progress" aria-hidden="true"><span style={{ width: `${(activeStage + 1) * 25}%` }} /></div>
              </div>
            </div>
          </article>

          <article className={`anc-lab-card anc-payment-card ${paymentState === "connected" ? "is-connected" : ""}`}>
            <div className="anc-lab-card-head"><span>02 / PAGO DIRECTO</span><i /></div>
            <div className="anc-payment-stage">
              <div className="anc-ticket-node"><span>ENTRADA</span><b>01</b></div>
              <div className="anc-payment-rail"><em /><em /><em /></div>
              <div className="anc-account-node"><span>TU CUENTA</span><b>MP</b></div>
            </div>
            <p className="anc-payment-copy">{paymentState === "connected" ? "Ruta preparada: la venta se procesa con la cuenta de Mercado Pago que conectó tu organización." : "Conecta Mercado Pago para preparar una ruta de cobro directo para las ventas de tu evento."}</p>
            <button type="button" className="anc-lab-action" onClick={() => setPaymentState((state) => state === "idle" ? "connected" : "idle")}>
              {paymentState === "connected" ? "REINICIAR DEMOSTRACIÓN" : "VER RUTA DE COBRO →"}
            </button>
          </article>

          <article className={`anc-lab-card anc-qr-card ${qrState === "valid" ? "is-valid" : ""}`}>
            <div className="anc-lab-card-head"><span>03 / PUERTA EN MOVIMIENTO</span><i /></div>
            <div className="anc-qr-stage">
              <div className="anc-qr-code" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="anc-scan-line" aria-hidden="true" />
              <p>{qrState === "valid" ? "ACCESO VALIDADO" : "LISTO PARA ESCANEAR"}</p>
            </div>
            <p className="anc-payment-copy">{qrState === "valid" ? "El QR quedó registrado como utilizado para evitar una validación duplicada." : "El staff asignado escanea cada ticket desde su propia cuenta y permiso de evento."}</p>
            <button type="button" className="anc-lab-action" onClick={() => setQrState((state) => state === "idle" ? "valid" : "idle")}>
              {qrState === "valid" ? "ESCANEAR OTRO QR" : "SIMULAR ESCANEO →"}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
