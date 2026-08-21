# ANC Tickets — Hito de plataforma implementado

**Fecha:** 21 de agosto de 2026  
**Rama de implementación:** `feat/neon-stack-foundation`  
**Commit:** `1a3d72d`  
**Repositorio:** [alexisnegrocalderon/anctickets](https://github.com/alexisnegrocalderon/anctickets/tree/feat/neon-stack-foundation)

## Alcance completado

ANC Tickets ya cuenta con una base de producción independiente en Neon, preparada para integrarse a un proyecto Vercel propio y al subdominio `tickets.ancdigital.cl`. Se mantuvo el prototipo visual separado; los cambios se aplicaron sobre la rama de producto del repositorio real.

| Área | Resultado |
| --- | --- |
| Base de datos | Se creó el proyecto Neon dedicado `anc-tickets`, con una rama de staging y un esquema base promovido a la rama principal. |
| Identidad | Se incorporó Better Auth para Google OAuth y Magic Link; la interfaz de login ya usa el nuevo cliente y Resend queda como proveedor de correo. |
| Autorización | El modelo incluye administración ANC, organizaciones, managers y staff de puerta revocable por evento. |
| Inventario | Se incorporó una función de reserva que bloquea cupos dentro de una transacción. |
| Check-in | Se incorporó una función de validación QR que registra cada intento, permite el primer acceso y rechaza un segundo escaneo. |
| Producto | El escáner y el header se migraron hacia Better Auth; el endpoint de validación utiliza el control atómico de Neon. |
| Calidad | `npm run check` y `NODE_ENV=production npm run build` finalizaron correctamente. |

## Validaciones realizadas

La migración de esquema se verificó en una rama temporal de Neon antes de promoverse. La prueba de reserva temporal dejó 2 entradas reservadas de una capacidad de 5. La prueba de acceso temporal aceptó el primer QR y devolvió `already_used` en la segunda lectura del mismo QR. Las dos funciones quedaron confirmadas en la rama principal de Neon.

## Configuración pendiente antes de probar usuarios reales

No se cargaron secretos ni se enviaron correos reales. El siguiente paso requiere configurar secretos exclusivamente en el proyecto de Vercel de la ticketera, nunca en el repositorio.

| Configuración | Acción requerida |
| --- | --- |
| Neon | Cargar `DATABASE_URL` y `DATABASE_URL_UNPOOLED` del proyecto `anc-tickets`; usar la URL pooled en runtime y la directa solo para migraciones. |
| Better Auth | Definir `BETTER_AUTH_URL` como `https://tickets.ancdigital.cl` y crear un `BETTER_AUTH_SECRET` largo y aleatorio. |
| Google | Crear o reutilizar una aplicación OAuth y registrar `https://tickets.ancdigital.cl/api/auth/callback/google` como URL de retorno autorizada. |
| Resend | Verificar el dominio remitente y cargar `RESEND_API_KEY` junto a `EMAIL_FROM`, por ejemplo `ANC Tickets <tickets@ancdigital.cl>`. |
| Mercado Pago | Cargar credenciales Marketplace y secreto de webhook en Vercel; no guardar tokens de organizadores en el navegador. |
| Vercel | Crear o habilitar el proyecto `anc-tickets` en el equipo. La creación previa quedó bloqueada por un permiso 403, por lo que el subdominio aún no se asocia. |

## Trabajo siguiente recomendado

La siguiente entrega debe migrar checkout, emisión de órdenes y el webhook de Mercado Pago al esquema Neon. El checkout debe llamar la reserva atómica antes de crear una preferencia; el webhook debe registrar el identificador externo de forma única, convertir la reserva en venta y emitir tickets solo una vez. Después se deben migrar las pantallas de eventos, dashboard y administración desde las consultas heredadas de Supabase.

## Nota de seguridad

La plataforma no debe exponerse a ventas reales hasta que Google OAuth, Magic Link, Resend, Mercado Pago, redirects de dominio y pruebas de webhooks estén configurados en staging. Las funciones de inventario y puerta ya existen, pero el checkout heredado todavía usa la capa Supabase y requiere la migración indicada arriba.
