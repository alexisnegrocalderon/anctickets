# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Productores de eventos en Chile — quien organiza una fiesta, tocata, festival o
fecha de club y necesita venderle entradas a su público. Trabajan con márgenes
ajustados, suelen coordinar desde el teléfono y muchas veces arman la fecha con
poco tiempo. Su trabajo con ANC es: crear la fecha, abrir la venta, cobrar, y
controlar el acceso en la puerta.

El comprador final **no es** el usuario de esta página: llega directo al link
público del evento que el productor comparte por redes. El home existe para
convencer al productor.

## Product Purpose

Que un productor pueda publicar su fecha y empezar a vender entradas en minutos,
recibiendo el dinero directo en la cuenta de Mercado Pago de su organización, sin
pagarle nada a la plataforma. Éxito = un productor crea su evento, conecta
Mercado Pago y vende su primera entrada sin ayuda ni soporte.

## Positioning

ANC no le cobra comisión de plataforma al productor: el organizador recibe el
**100% del valor base** de cada entrada, directo en su propia cuenta de Mercado
Pago (no en una cuenta de ANC que después liquida). El cargo por servicio del
10% lo paga el comprador sobre el total, y de ahí sale tanto la comisión de
procesamiento de Mercado Pago (~3,8%) como el margen de ANC (~6,2%).

Decisión de comunicación confirmada con el usuario: el mensaje del home destaca
el **$0 para el productor**; el detalle del cargo de servicio del comprador va en
letra chica / preguntas frecuentes, no en el titular. No inventar comparaciones
con la competencia (no hay datos confirmados de otras ticketeras).

## Operating Context

- Vida nocturna y eventos en Chile; moneda CLP, español de Chile.
- El productor comparte el link de su evento por Instagram/WhatsApp; el tráfico
  de compra es mayoritariamente móvil.
- En la puerta, el staff del productor escanea QR desde su propio teléfono con
  permisos por evento.
- El pago pasa por Mercado Pago Chile con OAuth Connect (split payments), solo
  pago único sin cuotas — deliberado, para garantizar que el organizador reciba
  el 100% del valor base.

## Capabilities and Constraints

Funcionalidad confirmada en el código:

- Asistente de creación de evento por pasos (mood/tema, título, fecha y lugar,
  descripción, imagen, tipos de entrada, revisión) con borrador auto-guardado y
  vista previa en vivo.
- Conexión OAuth con Mercado Pago por organización.
- Tipos de entrada con precio base y cupo; control de stock y estado agotado.
- Página pública de evento por slug, con tarjeta de acceso coloreada según el
  tema elegido por el productor.
- Compra con login Google, generación de QR, email de confirmación (Resend).
- Escáner de puerta que invalida QR ya usados; exportación CSV de asistentes.
- Stack: Next.js (App Router) + TypeScript + Tailwind v4, Supabase (Postgres,
  Auth Google, RLS), Mercado Pago, Resend, GSAP + Lenis + Motion, Three.js.

Restricciones:

- El checkout no ofrece cuotas (por diseño, ver `src/lib/fees.ts`).
- El evento necesita título y fecha antes de existir como borrador.

## Brand Commitments

- Nombre **ANC Tickets**; isotipo existente en `public/anc-mark.png` — ambos se
  mantienen, confirmado por el usuario.
- Paleta "Retro Future" confirmada: magenta `#FF206E`, amarillo `#FBFF12`,
  turquesa `#41EAD4`, charcoal `#222222`, sobre fondo casi negro `#090909`.
- El video del hero es el único material visual existente que el usuario quiere
  conservar.
- Tono: cercano, directo y fiestero — no corporativo, no "élite exclusiva".
- Idioma: español de Chile.

## Evidence on Hand

**Pre-lanzamiento.** No hay testimonios, logos de productoras, métricas de venta,
casos de éxito ni prensa. Confirmado por el usuario: la página debe convencer sin
prueba social. No fabricar ninguna de estas cosas.

Material real disponible: el video del hero, el isotipo, y los eventos que los
productores publiquen en la base de datos (hoy pueden ser cero).

Las fotos de stock que traía el sitio (multitud, pulsera, ambiente) fueron
descartadas por el usuario: no combinan con la paleta y serán reemplazadas por
fotografía propia más adelante.

## Product Principles

1. **El productor cobra, no paga.** Todo el mensaje se ordena alrededor de que el
   dinero llega íntegro y directo a su cuenta.
2. **De la idea a la venta en minutos.** Cualquier fricción en crear la fecha es
   una falla del producto, no del usuario.
3. **Sin prueba social prestada.** Mientras no haya clientes reales, la confianza
   se gana mostrando el producto y siendo transparente, nunca inventando.
4. **Móvil primero en la compra, escritorio cómodo en la gestión.**
5. **La puerta también es producto.** El control de acceso es parte de la promesa,
   no un extra.

## Accessibility & Inclusion

Sin requisito formal establecido por el usuario. El código ya respeta
`prefers-reduced-motion` de forma consistente y debe seguir haciéndolo: el sitio
usa movimiento intenso y esa salida no es opcional.
