# ANC Tickets

Ticketera express de **ANC** (sitio oficial [ancdigital.cl](https://ancdigital.cl)).

El comprador paga el valor de la entrada más un cargo de servicio del 10%
(calculado sobre el total que paga). El organizador recibe el 100% del valor
de su entrada directo en su cuenta de Mercado Pago, sin pagar nada por usar
el sistema. Del cargo de servicio, Mercado Pago se queda con ~3,9% del total
(su comisión de procesamiento) y ANC Tickets con la diferencia, ~6,1% del
total (ver `src/lib/fees.ts`).

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
2. En **SQL Editor**, ejecuta el contenido de `supabase/migrations/0001_init.sql`
   (crea tablas, RLS policies y el trigger que crea el `profile` al registrarse).
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
   (la de ANC, dueña de la aplicación) — se usa para consultar el estado de
   los pagos vía API en el webhook.
6. Configura la URL de notificaciones (webhooks) en el panel de tu app:
   `https://TU_DOMINIO/api/webhooks/mercadopago`.

### 4. Resend (emails)

1. Crea una cuenta en [resend.com](https://resend.com) y verifica el dominio
   `ancdigital.cl` (o el que uses para enviar correos).
2. Copia el API key a `RESEND_API_KEY`.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Flujo de la aplicación

1. **Login** con Google (`/login`).
2. **Organizador**: conecta su cuenta de Mercado Pago
   (`/dashboard/mercadopago/connect`) y crea/edita eventos y tipos de entrada
   (`/dashboard/events`).
3. **Comprador**: navega eventos publicados (`/`), selecciona entradas en la
   página del evento (`/events/[id]`) y paga con Mercado Pago Checkout Pro.
4. Al aprobarse el pago (webhook `/api/webhooks/mercadopago`), se generan los
   tickets con QR único y se envía el email de confirmación.
5. El comprador ve sus entradas con QR en `/dashboard/tickets`.
6. El organizador valida entradas en la puerta escaneando el QR desde
   `/dashboard/events/[id]/scan` (funciona desde cualquier dispositivo con
   cámara, sin apps).

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura las mismas variables de entorno de `.env.example` en el
   proyecto de Vercel (usa la URL de producción, ej.
   `https://tickets.ancdigital.cl`, en `NEXT_PUBLIC_SITE_URL` y en todos los
   redirect URIs de Supabase / Google / Mercado Pago).
3. Apunta tu dominio/subdominio (ej. `tickets.ancdigital.cl`) al proyecto de
   Vercel.
