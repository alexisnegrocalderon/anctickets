# Cómo usar el Production Launch Runbook de ANC Tickets

## Qué es este documento

`PRODUCTION_LAUNCH_RUNBOOK.md` es la lista de verificación operativa para transformar una vista previa que compila en una plataforma capaz de aceptar clientes reales. No se ejecuta en la terminal. Se sigue desde las cuentas propietarias de Vercel, Neon, Google Cloud, Resend y Mercado Pago.

> No copies secretos al repositorio, a GitHub, al chat ni a archivos `.env` que se suban con Git. Guárdalos únicamente en las variables de entorno del proyecto Vercel correcto.

## 1. Abrir el proyecto correcto

En Vercel abre [anc-vercel-team/anctickets](https://vercel.com/anc-vercel-team/anctickets). Confirma que el repositorio conectado sea `alexisnegrocalderon/anctickets` y que pueda construir la rama `feat/neon-stack-foundation` como vista previa. La PR de lanzamiento actual es [#1](https://github.com/alexisnegrocalderon/anctickets/pull/1).

No promociones la PR a producción todavía. Primero completa las variables y los callbacks de los proveedores.

## 2. Añadir variables de entorno en Vercel

Dentro del proyecto, abre **Settings → Environment Variables**. Agrega cada variable para **Preview** y **Production**. Para pruebas locales, utiliza valores separados en `.env.local`, que no se sube a Git.

| Variable | Valor para producción | Dónde obtenerla |
| --- | --- | --- |
| `DATABASE_URL` | URL pooled de Neon terminada en `?sslmode=require` | Neon → Dashboard → Connection Details. |
| `DATABASE_URL_UNPOOLED` | URL directa de Neon terminada en `?sslmode=require` | Neon → Dashboard → Connection Details. |
| `BETTER_AUTH_URL` | `https://tickets.ancdigital.cl` | Valor fijo de producción. |
| `NEXT_PUBLIC_SITE_URL` | `https://tickets.ancdigital.cl` | Valor fijo de producción. |
| `BETTER_AUTH_SECRET` | Secreto aleatorio persistente, mínimo 32 bytes | Genera con `openssl rand -base64 32` en una terminal segura. |
| `ANC_ADMIN_EMAIL` | Correo real de la persona que aprobará productores | Decide el correo operativo ANC antes de su primer registro. |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth | Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Secreto del cliente OAuth | Google Cloud Console. |
| `RESEND_API_KEY` | Clave de API de Resend | Resend → API Keys. |
| `EMAIL_FROM` | Por ejemplo `ANC Tickets <tickets@ancdigital.cl>` | Resend, después de verificar dominio/remitente. |
| `MP_APP_CLIENT_ID` | ID de aplicación Marketplace | Mercado Pago Developers. |
| `MP_APP_CLIENT_SECRET` | Secreto de aplicación Marketplace | Mercado Pago Developers. |
| `MP_ANC_ACCESS_TOKEN` | Token de cuenta técnica ANC | Mercado Pago Developers. |
| `MP_WEBHOOK_SECRET` | Secreto de firma para notificaciones | Mercado Pago Developers → Webhooks. |

Guarda los cambios. Vercel puede pedir un nuevo despliegue para aplicar las variables; usa **Redeploy** sobre la vista previa de la PR #1, no producción.

## 3. Configurar cada proveedor externo

| Proveedor | Acción exacta |
| --- | --- |
| Google Cloud | En la credencial OAuth, agrega `https://tickets.ancdigital.cl/api/auth/callback/google` como URI de redirección autorizada. |
| Resend | Verifica el dominio o remitente usado en `EMAIL_FROM`. Envía un Magic Link de prueba a una cuenta propia. |
| Mercado Pago | En la aplicación Marketplace, configura `https://tickets.ancdigital.cl/api/mercadopago/oauth/callback` como redirect URI y `https://tickets.ancdigital.cl/api/webhooks/mercadopago` como URL de notificación. |
| Vercel Domains | Agrega `tickets.ancdigital.cl`, copia el registro DNS que Vercel indique y espera su verificación. |

## 4. Preparar al administrador ANC

Define `ANC_ADMIN_EMAIL` antes del primer registro de ese correo. Si ese correo ya se registró, ejecuta una sola vez la consulta SQL de **Administrador inicial** incluida en `PRODUCTION_LAUNCH_RUNBOOK.md` desde el editor SQL de Neon, sustituyendo el correo de ejemplo por el real.

Después, inicia sesión con ese correo y abre `/dashboard/admin/organizations`. Ahí aparecerán las solicitudes de activación de productores.

## 5. Validar en la vista previa

Después de cargar variables y callbacks, abre la vista previa de la PR #1 y prueba este orden: Magic Link o Google → crear organización → solicitar activación → aprobar con la cuenta ANC → conectar Mercado Pago → crear evento → publicar → comprar una entrada de prueba → revisar ticket QR → escanear una vez y confirmar bloqueo al segundo intento.

Si cualquiera de estos pasos falla, no promociones la PR. Comparte el error visible o el log de Vercel y se corrige antes del lanzamiento.

## 6. Promover a producción

Cuando la prueba controlada esté completa, fusiona la PR #1 hacia la rama predeterminada `claude/anc-ticketera-express-5zs4a0`. Vercel iniciará el despliegue de producción asociado al proyecto `anctickets`. Comprueba que `https://tickets.ancdigital.cl` carga el despliegue y repite las pruebas esenciales de inicio de sesión, checkout y ticket.

## Referencias

[1]: https://vercel.com/docs/projects/environment-variables "Vercel — Environment Variables"
[2]: https://www.better-auth.com/docs/reference/options "Better Auth — Options"
