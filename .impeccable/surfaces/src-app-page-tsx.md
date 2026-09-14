---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

## Scope

Home público (`/`) de ANC Tickets. Visitor mode: **Persuade**. Audiencia única:
el productor de eventos en Chile (el comprador llega por el link del evento, no
por acá). Acción: publicar su fecha / entrar a crear evento. Sin prueba social
disponible (pre-lanzamiento): la confianza se gana mostrando el mecanismo.

## Direction contract

**THESIS.** La página es el muro de la ciudad donde se pegan los afiches de
fiesta, y la fecha del productor es el afiche que quedó encima. Se niega al
layout de landing SaaS que ya se rechazó dos veces: nada de héroe centrado con
screenshot del dashboard flotando en un browser frame, nada de tres tarjetas con
íconos.

**OWN-WORLD.** Papel de afiche sobre negro #090909. Tintas planas sobreimpresas
en magenta #FF206E, amarillo #FBFF12 y turquesa #41EAD4, con registro corrido de
serigrafía barata. Bordes rasgados reales (clip-path irregular, nunca
border-radius), cinta adhesiva, corchetes, capas pegadas con sombra dura y
esquinas despegadas. Una sola familia tipográfica condensada en caja alta a
escala de afiche; la jerarquía sale del tamaño, la caja y las reglas impresas,
nunca de una segunda fuente decorativa. El color se raciona: un solo afiche
encendido a la vez, el resto en tinta apagada.

**STORY.** El productor entiende en tres segundos que acá publica su fecha; cree
que la plata le llega entera porque lo ve dibujado como un ruteo, no escrito como
una promesa; y hace clic en PUBLICAR MI FECHA.

**FIRST VIEWPORT.** Muro a sangre. Al fondo, capas de afiches viejos rasgados en
tinta apagada, con un rasgón que deja ver el video del hero. Encima, un solo
afiche entero pegado torcido 2°, ocupando ~60% del ancho a la izquierda, magenta
sobreimpreso, con el titular en caja alta gigante a tres líneas: VENDE. / COBRA /
DIRECTO. Bajo el titular, un timbre de goma negro torcido: COSTO ANC $0. Arriba a
la izquierda, el wordmark ANC pegado como sticker. La acción primaria es un
afiche chico amarillo corchetado a la derecha: PUBLICAR MI FECHA. Sin barra de
navegación flotante traslúcida.

**FORM.** Muro de afiches — candidata #1 de la lista ordenada por resonancia,
elegida por el usuario por sobre la asignación del dado (#5, Mesa de Sonido).
Seed key: 52171c03. Elevada con tres disciplinas ganadas a challengers vencidos:
racionamiento del color (vidriero), una sola familia tipográfica con jerarquía
por escala y reglas (terminal de fósforo), y controles que desplazan material y
mantienen su estado (pigmento flotado). Interacción firma: **arrancar el afiche**
— el afiche de "otras ticketeras te descuentan" se rasga con el scroll y se queda
rasgado, dejando ver debajo el afiche de ANC intacto.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Unresolved

- Fotografía propia: el usuario la producirá después. Hasta entonces el muro se
  construye con material generado en código (tinta, papel, rasgado), nunca con
  fotos de stock.
- Comp round: no ejecutable (sin generación de imágenes en este plan). Build
  code-led por contrato, no por omisión.
