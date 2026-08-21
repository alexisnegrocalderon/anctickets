# ANC Tickets — Migración de checkout a Neon

## Flujo objetivo

El checkout no debe vender inventario solo porque el navegador lo solicitó. Primero debe reservar cupos en Neon; luego crea la preferencia de Mercado Pago. La venta y los QR se emiten únicamente después de que el servidor verifica el pago y la transacción se confirma en Neon.

| Paso | Responsable | Resultado requerido |
| --- | --- | --- |
| 1. Identidad | Better Auth | Obtiene comprador autenticado y su correo. |
| 2. Reserva | Neon | Bloquea inventario por tipo de entrada con expiración corta. |
| 3. Orden pendiente | Neon | Persiste precios calculados en servidor, ítems y referencia de reserva. |
| 4. Preferencia | Mercado Pago | Recibe la orden como `external_reference`; la URL de notificación apunta al backend de ANC. |
| 5. Notificación | Mercado Pago → backend | El backend consulta el pago en Mercado Pago, no confía solo en el cuerpo entrante. |
| 6. Idempotencia | Neon | Registra el evento externo de pago y permite reintentos pendientes, pero nunca una segunda emisión. |
| 7. Confirmación | Neon | Convierte reserva en venta, descuenta reserva, aumenta venta y emite QR dentro de una misma transacción. |
| 8. Comunicación | Resend | Envía correo después de confirmar la transacción; un fallo de correo no invalida la entrada. |

## Cambios necesarios al esquema ya promovido

| Cambio | Razón |
| --- | --- |
| Cuenta Mercado Pago por organización | El esquema anterior almacenaba la conexión por usuario; el nuevo modelo debe pertenecer a la organización organizadora. |
| Registro de procesamiento de pago | El evento externo debe poder reintentarse si hubo un corte entre registrarlo y finalizar la orden. |
| Función de finalización de orden | La emisión de QR y la conversión de stock deben ser una sola unidad transaccional. |
| Expiración de reservas | Las reservas vencidas deben liberar stock antes de calcular disponibilidad. |

## Invariantes de seguridad

> Una orden aprobada solo puede emitir tickets una vez; una entrada emitida no debe volver a descontar inventario; una reserva vencida no debe bloquear cupos.

El frontend nunca informa precios finales, comisiones, acceso de Mercado Pago ni inventario disponible como fuente de verdad. Todos se recuperan en servidor desde Neon. El webhook verifica el pago mediante la API de Mercado Pago y el registro de eventos externos evita que reintentos dupliquen emisión.

Mercado Pago documenta que sus Webhooks incluyen una firma secreta, que la recepción debe confirmarse y que los reintentos se producen si no se responde oportunamente. [1]

## Pruebas de aceptación

| Caso | Resultado esperado |
| --- | --- |
| Dos compradores piden el último cupo | Solo una reserva termina exitosamente. |
| Mercado Pago reintenta el mismo pago | La orden y sus QR no se duplican. |
| Pago no aprobado | La reserva queda pendiente hasta expiración o se libera conforme al estado final. |
| Fallo de correo posterior a pago | Orden y QR permanecen válidos; el correo puede reintentarse. |
| Staff escanea dos veces | Primera lectura aceptada; segunda lectura rechazada y auditada. |

## Referencias

[1]: https://www.mercadopago.cl/developers/en/docs/checkout-pro/additional-content/notifications/webhooks "Mercado Pago Chile — Webhooks"
