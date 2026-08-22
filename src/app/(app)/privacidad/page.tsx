import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — ANC Tickets",
  description: "Cómo ANC Tickets recopila, usa y protege tus datos.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 text-[#f5f4f1] sm:py-16">
      <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#a77fff]">
        Legal
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        Política de Privacidad
      </h1>
      <p className="mt-3 text-sm text-neutral-500">Última actualización: agosto de 2026</p>

      <div className="mt-10 flex flex-col gap-8 text-[15px] leading-7 text-neutral-300">
        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">1. Quiénes somos</h2>
          <p className="mt-2">
            ANC Tickets (&ldquo;ANC&rdquo;, &ldquo;nosotros&rdquo;) es una plataforma que permite a productores de
            eventos en Chile crear páginas de venta y vender entradas directo a su
            cuenta de Mercado Pago. Esta política explica qué datos recopilamos de
            compradores y productores, y cómo los usamos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">2. Qué datos recopilamos</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="text-[#f5f4f1]">Cuenta de Google:</span> nombre, email y
              foto de perfil, entregados por Google al iniciar sesión.
            </li>
            <li>
              <span className="text-[#f5f4f1]">Compras y entradas:</span> eventos,
              tipos de entrada y cantidades compradas, para emitir tus tickets con
              código QR.
            </li>
            <li>
              <span className="text-[#f5f4f1]">Pagos:</span> el pago lo procesa
              directamente Mercado Pago. ANC no recibe ni almacena datos de tu
              tarjeta — solo el resultado de la transacción (aprobado, rechazado,
              monto).
            </li>
            <li>
              <span className="text-[#f5f4f1]">Cuenta de Mercado Pago (productores):</span>{" "}
              si conectas tu cuenta para vender, guardamos las credenciales de
              acceso que Mercado Pago nos entrega vía OAuth, para procesar tus
              ventas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">3. Para qué usamos tus datos</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Procesar tu compra y generar tu entrada con código QR.</li>
            <li>Enviarte el correo de confirmación de compra.</li>
            <li>
              Permitir que el staff del evento valide tu entrada en la puerta
              (escaneo del QR).
            </li>
            <li>
              Permitir que el productor de un evento vea la lista de compradores y
              las ventas de <span className="text-[#f5f4f1]">su propio evento</span>{" "}
              — nunca de eventos de otros productores.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">4. Con quién compartimos datos</h2>
          <p className="mt-2">
            Compartimos datos con <span className="text-[#f5f4f1]">Mercado Pago</span>{" "}
            (para procesar el pago) y con el{" "}
            <span className="text-[#f5f4f1]">productor del evento</span> que compraste
            (email y detalle de tu compra, para gestionar el ingreso). No vendemos
            ni compartimos tus datos con terceros para fines publicitarios.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">5. Cómo protegemos tus datos</h2>
          <p className="mt-2">
            Los datos se almacenan con acceso restringido por fila (cada usuario
            solo puede ver su propia información y, si es productor, la de sus
            propios eventos) y toda la comunicación con el sitio viaja cifrada
            (HTTPS).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">6. Tus derechos</h2>
          <p className="mt-2">
            Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a{" "}
            <a href="mailto:tickets@ancdigital.cl" className="text-[#c3adff] underline underline-offset-2">
              tickets@ancdigital.cl
            </a>
            . Ten en cuenta que algunos datos de compras aprobadas se conservan por
            obligaciones tributarias/contables.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#f5f4f1]">7. Contacto</h2>
          <p className="mt-2">
            Cualquier duda sobre esta política, escríbenos a{" "}
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
