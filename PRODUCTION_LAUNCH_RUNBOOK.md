# ANC Tickets — Runbook de lanzamiento controlado

## Propósito

Este documento describe las configuraciones externas y la prueba operativa necesarias para habilitar productores reales en `tickets.ancdigital.cl`. El código ya unifica autenticación, organizaciones, eventos, tickets y conexión de Mercado Pago en Neon; las credenciales y verificaciones de terceros siguen requiriendo acciones dentro de las cuentas propietarias.

## Variables de producción

Configura las siguientes variables en el proyecto Vercel correcto. No pegues valores de producción en el repositorio ni en archivos `.env` versionados.

| Variable | Valor o fuente esperada | Uso |
| --- | --- | --- |
| `DATABASE_URL` | URL pooled de Neon con SSL | Consultas de runtime. |
| `DATABASE_URL_UNPOOLED` | URL directa de Neon con SSL | Migraciones y operaciones administrativas. |
| `BETTER_AUTH_URL` | `https://tickets.ancdigital.cl` | Base URL explícita para autenticación. |
| `NEXT_PUBLIC_SITE_URL` | `https://tickets.ancdigital.cl` | Retornos de checkout y callbacks de pagos. |
| `BETTER_AUTH_SECRET` | Secreto criptográfico único y persistente | Cookies de sesión y estado firmado de Mercado Pago. |
| `ANC_ADMIN_EMAIL` | Correo del primer operador ANC | Asigna `anc_admin` cuando ese usuario se registra por primera vez. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google | Acceso con Google. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Dominio y remitente verificados en Resend | Magic Link y correos transaccionales. |
| `MP_APP_CLIENT_ID` / `MP_APP_CLIENT_SECRET` | App Marketplace de Mercado Pago | Conexión OAuth de cada organización. |
| `MP_ANC_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` | Cuenta técnica y secreto de webhook | Lectura segura de pagos y validación de notificaciones. |

> Mantén `BETTER_AUTH_SECRET` estable una vez lanzado. Cambiarlo sin una rotación planificada invalida sesiones y los estados firmados pendientes.

## Configuración de OAuth y dominios

En Google Cloud, registra como callback autorizado `https://tickets.ancdigital.cl/api/auth/callback/google`. En Mercado Pago, configura como redirect URI `https://tickets.ancdigital.cl/api/mercadopago/oauth/callback` y como notificación `https://tickets.ancdigital.cl/api/webhooks/mercadopago`. En Resend, verifica el dominio de envío antes de usar `EMAIL_FROM`.

Conecta `tickets.ancdigital.cl` al proyecto Vercel que despliega `alexisnegrocalderon/anctickets`. En la revisión actual del conector Vercel no apareció un proyecto accesible en el equipo autorizado, por lo que este vínculo y sus secretos deben verificarse desde la cuenta que administra el proyecto antes de abrir ventas.

## Administrador inicial

Define `ANC_ADMIN_EMAIL` **antes** del primer registro de ese correo. Para convertir una cuenta existente en administración ANC, ejecuta una sola vez en Neon, sustituyendo el correo por el real:

```sql
INSERT INTO profiles (user_id, global_role)
SELECT id, 'anc_admin'
FROM "user"
WHERE email = 'operador@ancdigital.cl'
ON CONFLICT (user_id)
DO UPDATE SET global_role = EXCLUDED.global_role, updated_at = now();
```

El administrador accede a `/dashboard/admin/organizations`, donde aprueba o rechaza organizaciones. Solo una organización activa puede publicar eventos y abrir la conexión de Mercado Pago.

## Prueba de lanzamiento controlada

Realiza esta prueba con una organización real de prueba y un evento de cupo reducido antes de comunicar la plataforma públicamente.

| Paso | Resultado esperado |
| --- | --- |
| 1. Registro | Google y Magic Link llevan al panel autenticado. |
| 2. Organización | Se crea en `draft` y permite preparar eventos, pero no publicar. |
| 3. Activación ANC | La solicitud pasa a `review`; administración la aprueba y cambia a `active`. |
| 4. Mercado Pago | El propietario conecta su cuenta y el panel muestra el estado conectado. |
| 5. Evento | Se crea con entradas de valor positivo y se publica solo si la organización está activa. |
| 6. Checkout | La compra reserva inventario, redirige a Mercado Pago y vuelve al sitio. |
| 7. Webhook | Una aprobación emite QR una sola vez; una notificación repetida no duplica tickets. |
| 8. Comprador | El ticket aprobado aparece en **Mis entradas** con QR y estado válido. |
| 9. Puerta | El primer escaneo es válido y el segundo queda bloqueado como usado. |

## Criterio para abrir ventas

No anuncies ventas públicas hasta completar los nueve pasos y revisar los logs de Vercel para confirmar que no existan errores de autenticación, callback, webhook o emisión de tickets. Si un proveedor externo no está configurado, la aplicación debe seguir en modo de preparación y no recibir pagos reales.

## Referencias

[1]: https://www.better-auth.com/docs/reference/options "Better Auth — Options"
[2]: https://www.better-auth.com/docs/concepts/database "Better Auth — Database hooks"
