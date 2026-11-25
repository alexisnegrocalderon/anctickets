/**
 * ANC — las 4 funciones en UNA escena sticky: el celular queda fijo y su pantalla
 * cambia mientras el texto de cada función pasa al lado (escritorio) o debajo
 * (celular). Todo el texto está siempre en el DOM. Con reduced motion o sin JS
 * se muestran las 4 pantallas apiladas, cada una junto a su texto (.fs-inline).
 */
import Phone from "@/components/phone/phone";
import AmbassadorsScreen from "@/components/phone/ambassadors-screen";
import LiveSalesScreen from "@/components/phone/live-sales";
import ScannerScreen from "@/components/phone/scanner-screen";
import WizardScreen from "@/components/phone/wizard-screen";
import FeatureStageFx from "@/components/feature-stage-fx";
import { MotionPermissionButton } from "@/components/immersive-fx";
import RevealHeading, { type HeadingPart } from "@/components/reveal-heading";

type Feature = {
  id?: string;
  eyebrow: string;
  title: HeadingPart[];
  body: string;
  label: string;
  screen: () => React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: "crear",
    eyebrow: "01 · Crear",
    title: [{ t: "Crea tu evento " }, { t: "en 2 minutos.", accent: true }],
    body: "Un asistente paso a paso: nombre, fecha y entradas. Al terminar, tu evento queda publicado con su propio link para compartir.",
    label: "Celular con el asistente para crear un evento: flyer, fecha, entradas y el botón de publicar",
    screen: () => <WizardScreen />,
  },
  {
    eyebrow: "02 · Vender",
    title: [{ t: "Ventas " }, { t: "en vivo.", accent: true }],
    body: "Cada entrada vendida te llega como notificación. Mira subir los ingresos y la barra de entradas vendidas sin recargar nada.",
    label: "Celular con notificaciones de venta y el contador de ingresos subiendo",
    screen: () => <LiveSalesScreen variant="full" />,
  },
  {
    eyebrow: "03 · Controlar",
    title: [{ t: "Escáner QR " }, { t: "en la puerta.", accent: true }],
    body: "Tu staff valida desde su propio teléfono: la entrada aparece VÁLIDA en verde y el contador de ingresados sube. Un código ya usado no vuelve a entrar.",
    label: "Celular escaneando un QR: la entrada aparece VÁLIDA en verde y sube el contador de ingresados",
    screen: () => <ScannerScreen />,
  },
  {
    eyebrow: "04 · Crecer",
    title: [{ t: "Embajadores " }, { t: "y descuentos.", accent: true }],
    body: "Dale un código a tus embajadores y mira quién vende más. El dinero va directo a tu Mercado Pago, sin cuenta intermedia. Los nombres de la lista son de ejemplo.",
    label: "Celular con el ranking de embajadores, un código de descuento y el pago directo a Mercado Pago",
    screen: () => <AmbassadorsScreen />,
  },
];

export default function FeatureStage() {
  return (
    <section id="funciones" aria-label="Funciones de ANC Tickets" className="fs relative z-[1] px-4 sm:px-8 lg:px-12">
      <div className="fs-inner mx-auto max-w-6xl">
        {/* Celular fijo (modo sticky). */}
        <div className="fs-phone">
          <div className="fs-phone-tilt" data-tilt-global>
            <Phone label="Celular con las funciones de ANC Tickets: crear evento, ventas en vivo, escáner QR y embajadores">
              {FEATURES.map((f, i) => (
                <div key={i} className={`fs-screen${i === 0 ? " is-active" : ""}`}>
                  {f.screen()}
                </div>
              ))}
            </Phone>
          </div>
          <p className="fs-caption">Evento de ejemplo · datos ficticios</p>
          <MotionPermissionButton />
        </div>

        <div className="fs-list">
          {FEATURES.map((f, i) => (
            <article
              key={i}
              id={f.id}
              data-fs-step
              className={`fs-step scroll-mt-24${i === 0 ? " is-active" : ""}`}
              data-rev={i % 2 ? "" : undefined}
            >
              <div className="fs-copy">
                <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
                  {f.eyebrow}
                </p>
                <RevealHeading
                  parts={f.title}
                  className="mt-3 text-[clamp(2.4rem,9vw,4.6rem)] uppercase leading-[.96] text-white"
                />
                <p className="mt-4 max-w-[46ch] text-base leading-7 text-white/75 sm:text-lg">{f.body}</p>
              </div>
              {/* Solo se ve con reduced motion o sin JS. */}
              <div className="fs-inline">
                <Phone label={f.label}>{f.screen()}</Phone>
              </div>
            </article>
          ))}
        </div>
      </div>
      <FeatureStageFx rootId="funciones" />
      <noscript>
        <style>{`.fs .fs-phone{display:none}.fs .fs-inline{display:block}.fs .fs-step{min-height:0;opacity:1}.fs .fs-inner{display:block}`}</style>
      </noscript>
    </section>
  );
}
