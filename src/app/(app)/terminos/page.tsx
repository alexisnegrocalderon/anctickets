import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos del Servicio — ANC Tickets",
  description: "Condiciones de uso de ANC Tickets para compradores y productores.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 text-[#f5f4f1] sm:py-16">
      <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#a77fff]">
        Legal
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        Términos del Servicio
      </h1>
      <p className="mt-3 text-sm text-neutral-500">Última actualización: agosto de 2026</p>

      <div className="mt-10 flex flex-col gap-8 text-[15px] leading-7 text-neutral-300">
        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">1. Qué es ANC Tickets</h2>
          <p className="mt-2">
            ANC Tickets es una plataforma tecnológica que permite a productores de
            eventos (&ldquo;Productores&rdquo;) crear páginas de venta y vender entradas
            directamente a compradores (&ldquo;Compradores&rdquo;), con el pago procesado por
            Mercado Pago y depositado en la cuenta del Productor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">2. Nuestro rol</h2>
          <p className="mt-2">
            ANC actúa como intermediario tecnológico entre el Productor y el
            Comprador. El Productor es el único responsable de la realización,
            calidad, seguridad y legalidad de su evento. ANC no organiza los
            eventos publicados en la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">3. Compra de entradas</h2>
          <p className="mt-2">
            El Comprador paga el valor de la entrada más un cargo de servicio del
            10%, calculado sobre el total. El pago se procesa en una sola cuota vía
            Mercado Pago; ANC no ofrece pago en cuotas. Al completar la compra, el
            Comprador recibe su entrada con un código QR único.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">4. Acceso al evento</h2>
          <p className="mt-2">
            Cada entrada tiene un código QR de un solo uso, validado por el staff
            del Productor en la puerta. Una entrada ya validada no puede volver a
            usarse. El Comprador es responsable de cuidar su entrada; ANC no se
            hace responsable por códigos QR compartidos o filtrados por el propio
            Comprador.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">5. Cancelaciones y reembolsos</h2>
          <p className="mt-2">
            Las políticas de cancelación y reembolso de un evento son definidas por
            cada Productor. Si un evento se cancela o reprograma, el Comprador debe
            gestionar el reembolso directamente con el Productor. ANC solo
            gestiona reembolsos cuando el problema es atribuible a una falla de la
            propia plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">6. Cuentas y acceso</h2>
          <p className="mt-2">
            El acceso a ANC Tickets es mediante inicio de sesión con Google. Eres
            responsable de mantener el acceso a tu cuenta de Google segura;
            cualquier actividad realizada desde tu cuenta se entiende hecha por ti.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">7. Costo de la plataforma</h2>
          <p className="mt-2">
            ANC no cobra una comisión de plataforma sobre las ventas del Productor
            más allá del cargo de servicio ya incluido en el precio final que paga
            el Comprador. Las tarifas y condiciones del procesamiento de pago
            corresponden a Mercado Pago.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">8. Cambios a estos términos</h2>
          <p className="mt-2">
            Podemos actualizar estos términos para reflejar cambios en la
            plataforma. Los cambios relevantes se avisarán en el sitio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">9. Contacto</h2>
          <p className="mt-2">
            Dudas sobre estos términos, escríbenos a{" "}
            <a href="mailto:tickets@ancdigital.cl" className="text-[#c3adff] underline underline-offset-2">
              tickets@ancdigital.cl
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
