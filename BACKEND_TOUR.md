# ANC Tickets — Recorrido del backend

## Vista general

ANC Tickets está separado de `ancdigital.cl` y se prepara como una aplicación propia bajo `tickets.ancdigital.cl`. La interfaz, API y autorización viven en la aplicación Next.js; Neon contiene los datos y funciones transaccionales; Better Auth controla sesiones; Resend enviará Magic Links y correos; Mercado Pago procesa el cobro.

```text
Productor / comprador / staff
            ↓
Next.js en Vercel · tickets.ancdigital.cl
  ├─ Better Auth: Google + Magic Link
  ├─ Panel de organizadores y APIs
  ├─ Checkout y webhook Mercado Pago
  └─ Scanner de puerta
            ↓
Neon Postgres
  ├─ Usuarios, organizaciones y permisos
  ├─ Eventos, entradas, reservas y órdenes
  ├─ Códigos, embajadores y auditoría
  └─ Funciones atómicas de stock y check-in
            ↓
Resend / Mercado Pago
```

## Rutas principales

| Ruta | Qué hace | Estado |
| --- | --- | --- |
| `/` | Descubrimiento de eventos públicos. | Disponible en código. |
| `/login` | Google OAuth y Magic Link. | Implementado; necesita secretos de Google/Resend. |
| `/dashboard` | Espacio de trabajo de cada usuario. | Implementado. |
| `/dashboard/organizer/[slug]` | Resumen de cada productor. | Implementado. |
| `/dashboard/organizer/[slug]/events/new` | Creador inmersivo de seis momentos. | Implementado. |
| `/dashboard/organizer/[slug]/promotions` | Códigos de descuento menores a 100%. | Implementado. |
| `/dashboard/organizer/[slug]/ambassadors` | Códigos y comisión editable de embajadores. | Implementado. |
| `/dashboard/organizer/[slug]/staff` | Staff de puerta por evento. | Implementado. |
| `/api/checkout` | Crea reserva, orden y preferencia de pago. | Migrado a Neon; requiere credenciales Mercado Pago. |
| `/api/webhooks/mercadopago` | Verifica firma, confirma pago y emite tickets sin duplicados. | Migrado a Neon; requiere secreto de webhook. |
| `/api/tickets/validate` | Check-in QR atómico y bloqueo de doble lectura. | Migrado a Neon. |

## Qué ocurre al crear un evento

El productor crea su organización en borrador y abre **Crear la noche**. El creador guarda un evento borrador, su categoría, fecha, recinto, imagen, descripción y una o dos entradas pagadas según la elección. Los precios y cupos se validan en servidor: no se admiten valores menores o iguales a cero.

El evento queda listo para el siguiente paso operativo, pero solo ANC puede aprobar la primera activación de la organización y habilitar publicación/conexión de pagos. Esto permite onboarding fluido sin exponer ventas antes de validar al productor.

## Controles críticos ya construidos

| Control | Protección |
| --- | --- |
| Reserva de inventario | Bloquea cupos antes de iniciar Mercado Pago. |
| Confirmación de pago | Convierte reservas en ventas y emite QR en una transacción. |
| Reintentos de webhook | No duplican tickets gracias a idempotencia de pagos/orden. |
| Check-in QR | La primera lectura usa el ticket; la segunda queda rechazada y auditada. |
| Staff | Solo puede consultar o escanear eventos para los que recibió acceso. |
| Organizador | Puede gestionar su propia organización; no se convierte en admin ANC. |

## Configuración pendiente antes de una prueba real

La vista local muestra páginas públicas, pero el login y operaciones reales requieren cargar secretos en Vercel: conexión de Neon, clave/URL de Better Auth, cliente y secreto de Google, clave Resend, credenciales de Mercado Pago y secreto de webhook. Con esa configuración se prueba staging en este orden: Google/Magic Link, creación de organización, creador de evento, conexión Mercado Pago de prueba, compra sandbox, correo de ticket y escáner QR.
