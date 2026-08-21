# ANC Tickets — Onboarding y administración de organizadores

## Decisión de producto

Cada usuario que se registra puede crear su espacio de organizador de inmediato. El sistema crea una **organización en borrador**, asigna al creador como propietario y abre su panel administrativo. ANC interviene solo antes de la primera venta: revisa la organización y habilita publicación + conexión de Mercado Pago.

> El organizador obtiene valor de inmediato; ANC conserva el control mínimo necesario antes de exponer pagos y ventas al público.

## Flujo de alta simple

| Paso | Pantalla | Acción del organizador | Resultado |
| --- | --- | --- | --- |
| 1 | Registro | Google o Magic Link | Cuenta personal activa. |
| 2 | “Crea tu espacio” | Nombre de organización, URL corta, nombre de contacto y teléfono | Organización en estado `draft`; creador es `owner`. |
| 3 | Panel de organizador | Puede crear eventos borrador e invitar staff | No puede publicar ni vender aún. |
| 4 | “Solicitar activación” | Confirma información comercial y acepta términos | ANC recibe una solicitud de revisión. |
| 5 | Revisión ANC | Aprueba o rechaza con nota | Si aprueba: organización `active`, habilita publicación y conexión Mercado Pago. |

El estado debe ser visible y sencillo: **Borrador**, **En revisión**, **Activa** o **Suspendida**. No se introducen niveles extra durante el lanzamiento.

## Admin mínimo del organizador

| Área | Puede editar | No puede editar |
| --- | --- | --- |
| Perfil de organización | Nombre público, slug, logo, contacto de soporte, redes y descripción corta. | Estado de activación, tarifas de plataforma y términos ANC. |
| Eventos | Categoría libre, título, fecha/hora, recinto o dirección, imagen, descripción, capacidad, visibilidad y tipos de entrada. | Publicar si la organización no está activa; modificar datos críticos después de ventas sin aviso. |
| Tipos de entrada | Nombre, precio base, capacidad, venta desde/hasta y orden visual. | Reducir capacidad bajo entradas ya vendidas o reservadas. |
| Staff de puerta | Invitar por correo, conceder escaneo por evento, revocar acceso. | Acceder a finanzas, pagos, exportaciones globales o ajustes de plataforma. |
| Ventas | Ver órdenes, entradas, check-ins y exportación CSV del evento. | Alterar una orden aprobada o emitir tickets manualmente sin registro. |

Todos los eventos pueden pertenecer a cualquier categoría. El producto no bloquea por vertical; la categoría se usa solo para navegación y analítica.

## Descuentos simples

Los códigos de descuento se crean dentro de cada evento y se aplican a una o más categorías de entrada. Se admiten dos formatos: porcentaje o monto fijo. Cada código tiene nombre interno, código visible, vigencia, límite total de usos y límite por comprador.

| Regla | Decisión de lanzamiento |
| --- | --- |
| Acumulación | No; solo un código por compra. |
| Aplicación | Manual en checkout. |
| Valor | Porcentaje o monto fijo; nunca precio final negativo. |
| Límite | Usos totales, máximo por comprador y ventana temporal. |
| Auditoría | Cada uso queda ligado a la orden y al organizador que creó el código. |

No se incorporan campañas automáticas, cupones de primera compra, reglas complejas o descuentos combinables en la primera versión.

## Embajadores

Un embajador es una persona invitada por el organizador que recibe un código rastreable. La comisión se define **por código** y puede ser cero, porcentaje o monto fijo por entrada. La comisión se calcula con la orden aprobada, no con una reserva ni pago pendiente.

| Elemento | Regla |
| --- | --- |
| Identidad | Nombre, correo opcional y código único por evento. |
| Comisión | `0`, porcentaje o monto fijo; editable solo antes de ventas aprobadas o con bitácora de cambios. |
| Atribución | Se registra en la orden, incluso si la comisión es cero. |
| Liquidación | El dashboard muestra total atribuible; el pago se liquida fuera de ANC Tickets en el lanzamiento. |
| Alcance | Un embajador puede participar en varios eventos, pero cada código pertenece a un evento. |

No se automatizan transferencias, retiros, saldos ni impuestos de embajadores en la primera etapa.

## Roles y permisos

| Rol | Alcance |
| --- | --- |
| Administración ANC | Aprueba organizaciones, suspende ventas, revisa auditoría, gestiona incidentes y soporte. |
| Propietario de organización | Gestiona perfil, eventos, promociones, staff, reportes y conexión de pagos. |
| Manager de organización | Igual que propietario excepto cambios de propiedad, conexión de pagos y cierre de organización. |
| Staff de puerta | Solo escaneo y consulta de entradas para los eventos a los que fue invitado. |
| Comprador | Compra, consulta y descarga solo sus propias entradas. |

## Dashboard inicial

El panel debe abrir con cuatro indicadores: entradas vendidas, ingresos netos estimados, check-ins y ventas por código. Cada cifra filtra por periodo y evento, con acceso rápido a crear evento e invitar staff.

## Guardrails operativos

La primera publicación y la conexión de pagos exigen activación ANC. A partir de ahí, el organizador puede crear e invitar staff sin aprobación adicional. Cambios de capacidad, precio o fecha con ventas activas deben quedar auditados y requerir una confirmación explícita; cancelaciones y reembolsos quedan inicialmente en soporte ANC.

## Entidades adicionales necesarias

| Entidad | Finalidad |
| --- | --- |
| `organization_activation_requests` | Solicitud, estado, nota de revisión y decisión ANC. |
| `discount_codes` | Configuración de promoción por evento. |
| `discount_code_redemptions` | Uso trazable de un código en una orden aprobada. |
| `ambassadors` | Identidad, código y tipo/valor de comisión por evento. |
| `ambassador_attributions` | Comisión calculada y estado de liquidación asociado a una orden aprobada. |
| `audit_log` | Cambios sensibles: precios, capacidad, publicación, permisos y revocaciones. |

## Siguiente decisión pendiente

Antes de implementar se debe elegir el contenido exacto de la revisión ANC. La recomendación es pedir solo nombre legal o comercial, persona de contacto, teléfono, enlace de redes o web y una breve descripción de la actividad. No solicitar RUT, contratos ni documentos en el onboarding inicial; ANC puede pedir información adicional solo si la evaluación lo requiere.
