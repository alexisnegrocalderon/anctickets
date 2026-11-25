# ANC Tickets

Ticketera express de **ANC** (sitio oficial [ancdigital.cl](https://ancdigital.cl)).

El comprador paga el valor de la entrada más un cargo de servicio del 10%
(calculado sobre el total que paga). El organizador recibe el 100% del valor
de su entrada directo en su cuenta de Mercado Pago, sin pagar nada por usar
el sistema. Del cargo de servicio, Mercado Pago se queda con ~3,8% del total
(su comisión de procesamiento en pago único con tarjeta, incluyendo IVA) y
ANC Tickets con la diferencia, ~6,2% del total (ver `src/lib/fees.ts`). El
checkout solo admite pago único (sin cuotas): con cuotas la comisión real de
Mercado Pago supera el cargo de servicio del 10%, lo que impediría
garantizar que el organizador reciba el 100% de su entrada.

## Stack

- **Next.js** (App Router, TypeScript) + Tailwind CSS
- **Supabase**: Postgres + Auth (login con Google) + RLS
- **Mercado Pago**: OAuth Connect (marketplace/split payments)
- **Resend**: envío de emails de confirmación con QR
- **qrcode** / **html5-qrcode**: generación y lectura de códigos QR
- Deploy pensado para **Vercel**

## Requisitos previos (cuentas y credenciales externas)

Antes de correr el proyecto necesitas crear y configurar:

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden TODAS las migraciones de
   `supabase/migrations/` (`0001` a `0007`): tablas, RLS, el trigger que crea el
   `profile` al registrarse, y la `0007` con las reservas de stock, descuentos,
   embajadores, staff de puerta y las funciones SQL de ventas y check-in.
3. En **Authentication → Providers**, habilita **Google** e ingresa el
   Client ID / Secret de tu app de Google OAuth (ver punto 2).
4. En **Authentication → URL Configuration**, agrega como Redirect URL:
   `https://TU_DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback`
   para desarrollo).
5. Copia `Project URL`, `anon public key` y `service_role key` desde
   **Project Settings → API** a tu `.env.local`.

### 2. Google OAuth (para el login)

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   crea credenciales OAuth 2.0 tipo "Web application".
2. Como Authorized redirect URI, usa la URL de callback de tu proyecto
   Supabase: `https://TU_PROYECTO.supabase.co/auth/v1/callback`.
3. Pega el Client ID / Secret en Supabase (paso 1.3).

### 3. Mercado Pago (app Marketplace)

1. Crea una aplicación en
   [Mercado Pago Developers](https://www.mercadopago.cl/developers/panel).
2. Habilita el modelo **Marketplace** para poder usar `marketplace_fee` y
   OAuth Connect entre organizadores y tu app.
3. Configura la **Redirect URI** de OAuth:
   `https://TU_DOMINIO/api/mercadopago/oauth/callback`.
4. Copia `Client ID` y `Client Secret` a `.env.local`
   (`MP_APP_CLIENT_ID`, `MP_APP_CLIENT_SECRET`).
5. `MP_ANC_ACCESS_TOKEN` es el access token de **tu** cuenta de Mercado Pago
   (la de ANC, dueña de la aplicación). Es solo un **respaldo**: en un
   marketplace el pago vive en la cuenta del vendedor (el productor), así que
   el webhook consulta cada pago con el token OAuth del productor
   (identificado por el `user_id` de la notificación).
6. Configura la URL de notificaciones (webhooks) en el panel de tu app:
   `https://TU_DOMINIO/api/webhooks/mercadopago`.
7. En la sección de notificaciones/webhooks de tu app, copia la **clave
   secreta** (usada para firmar `x-signature`) a `MP_WEBHOOK_SECRET`. El
   endpoint rechaza cualquier notificación cuya firma no coincida.

### 4. Resend (emails)

1. Crea una cuenta en [resend.com](https://resend.com) y verifica el dominio
   `ancdigital.cl` (o el que uses para enviar correos).
2. Copia el API key a `RESEND_API_KEY`.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase (la service key solo vive en el servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL pública, sin barra final. Se usa en OAuth, back URLs de MP, correos y QR |
| `MP_APP_CLIENT_ID`, `MP_APP_CLIENT_SECRET` | App Marketplace de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Clave para verificar `x-signature` de los webhooks |
| `MP_ANC_ACCESS_TOKEN` | Respaldo para consultar pagos (ver arriba) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Correos con las entradas |
| `CRON_SECRET` | Protege `/api/cron/daily` (Vercel lo manda como `Authorization: Bearer`) |

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Flujo de la aplicación

1. **Login** con Google (`/login`).
2. **Productor**: conecta su cuenta de Mercado Pago
   (`/dashboard/mercadopago/connect`; el `state` de OAuth es un nonce en una
   cookie httpOnly) y crea/edita eventos en `/dashboard/events`. Para publicar
   necesita al menos un tipo de entrada y Mercado Pago conectado (salvo que
   todas las entradas sean gratis).
3. **Comprador**: elige entradas en `/{slug}` (opcionalmente con un código de
   descuento). El checkout (`/api/checkout`) calcula el precio en el servidor y
   **reserva el stock** 20 minutos (`create_pending_order`, atómico). Luego:
   - total > 0: crea la preferencia de Mercado Pago con el token del
     productor (`marketplace_fee` = parte de ANC) y redirige al pago;
   - total = 0 (entrada gratis o 100% de descuento): aprueba la orden de
     inmediato, sin Mercado Pago, y manda el correo.
4. **Webhook** (`/api/webhooks/mercadopago`): verifica la firma, consulta el pago
   con el token del vendedor, comprueba monto y vendedor, y llama a
   `approve_order` (idempotente: mueve reservado a vendido y emite los tickets).
   Rechazos liberan la reserva; reembolsos y contracargos anulan las entradas
   (`revert_order`). Errores transitorios devuelven 500 para que MP reintente.
   Si el correo falla, la orden queda aprobada con `email_sent_at` vacío y hay
   botones "Reenviar correo" (comprador y productor).
5. **Mis entradas** (`/mis-entradas`, cualquier usuario con sesión): estado de
   cada orden (con refresco automático mientras se confirma el pago), QR de cada
   entrada y reenvío al correo. `/dashboard/tickets` redirige aquí.
6. **Puerta** (`/scan/[eventId]`, productor y staff): cámara con resultado a
   pantalla completa, búsqueda manual y contador de ingresados. El check-in es
   atómico (`check_in_ticket`): una entrada no puede entrar dos veces ni en otro
   evento. `/dashboard/events/[id]/scan` redirige aquí.
7. **Panel del evento** (`/dashboard/events/[id]/edit`): tipos de entrada
   (con ventana de venta), códigos de descuento, embajadores (link
   `/{slug}?ref=CODIGO`, cookie de 30 días, tabla de ventas y CSV), staff de
   puerta, cortesías, ventas y exportación CSV de asistentes.

Las órdenes, el stock y los tickets solo los escribe el servidor (service role)
mediante funciones SQL; las políticas RLS y los triggers de la migración `0007`
impiden que un comprador o productor los modifique desde el navegador.

### Tareas programadas

`vercel.json` define un cron **diario** (el plan Hobby no permite más) en
`/api/cron/daily`, que expira reservas vencidas y toca la base para que el
proyecto gratuito de Supabase no se pause. La expiración también ocurre de
forma perezosa dentro de cada compra nueva, así que el stock no depende del cron.

### Tests

```bash
npm test
```

Cubren el cálculo de cargos, los descuentos y los helpers de seguridad
(redirects, CSV, slugs reservados).

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura las mismas variables de entorno de `.env.example` en el
   proyecto de Vercel (usa la URL de producción, ej.
   `https://tickets.ancdigital.cl`, en `NEXT_PUBLIC_SITE_URL` y en todos los
   redirect URIs de Supabase / Google / Mercado Pago).
3. Apunta tu dominio/subdominio (ej. `tickets.ancdigital.cl`) al proyecto de
   Vercel.

## Checklist de puesta en marcha

1. **Base de datos**: aplica `supabase/migrations/0007_fase0_ventas_seguras.sql`
   en el SQL Editor (después de 0001-0006). Revisa que no dé errores.
2. **Variables en Vercel**: todas las de la tabla de arriba, en especial
   `NEXT_PUBLIC_SITE_URL` de producción y un `CRON_SECRET` largo y aleatorio
   (`openssl rand -hex 32`).
3. **Mercado Pago**: la aplicación en **modo producción**, con el modelo
   Marketplace habilitado; Redirect URI
   `https://TU_DOMINIO/api/mercadopago/oauth/callback`; webhook de pagos en
   `https://TU_DOMINIO/api/webhooks/mercadopago` y su clave secreta en
   `MP_WEBHOOK_SECRET`.
4. **Google OAuth / Supabase Auth**: Redirect URLs de Supabase con
   `https://TU_DOMINIO/auth/callback` (y el de desarrollo si corresponde).
5. **Resend**: dominio verificado y `RESEND_FROM_EMAIL` con ese dominio.
6. **Despliega** y comprueba en Vercel que el cron `/api/cron/daily` aparece
   en la pestaña Cron Jobs.
7. **Compra de prueba** de punta a punta con una cuenta compradora distinta a la
   del productor: pago, redirect a `/mis-entradas?order=...`, correo con QR,
   escaneo en `/scan/[eventId]`, y un segundo escaneo que debe dar "YA USADA".
   Prueba también un código de descuento al 100% (camino gratis) y un reembolso
   desde Mercado Pago (la entrada debe quedar anulada).

