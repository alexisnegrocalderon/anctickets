---
name: ANC Tickets
description: La ticketera chilena donde el productor cobra directo — el muro de afiches de la ciudad, hecho producto.
colors:
  ink-magenta: "#ff206e"
  ink-yellow: "#fbff12"
  ink-turquoise: "#41ead4"
  ink-black: "#090909"
  paper: "#ece7dc"
  paper-dim: "#8f8877"
  wall: "#0c0b0a"
  charcoal: "#222222"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(3rem, 8.2vw, 6.4rem)"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 4.6rem)"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 400
    lineHeight: 0.84
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  none: "0"
spacing:
  poster-x: "24px"
  poster-y: "36px"
  section-y: "112px"
components:
  button-primary:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "20px 32px"
  button-primary-hover:
    backgroundColor: "#1d1d1d"
    textColor: "{colors.paper}"
  poster-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.none}"
    padding: "36px 24px"
  poster-magenta:
    backgroundColor: "{colors.ink-magenta}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "36px 24px"
  poster-yellow:
    backgroundColor: "{colors.ink-yellow}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.none}"
    padding: "36px 24px"
  poster-turquoise:
    backgroundColor: "{colors.ink-turquoise}"
    textColor: "#062622"
    rounded: "{rounded.none}"
    padding: "36px 24px"
---

# Design System: ANC Tickets

## Overview

**Creative North Star: "El Muro de Afiches"**

Una fecha en Chile no nace en un dashboard: nace en un afiche pegado en un muro,
encima de otros diez, con la esquina despegada y el corchete todavía puesto. ANC
Tickets es la herramienta de ese productor, así que el producto se ve como su
oficio y no como el software que lo administra. La superficie es hormigón
oscuro con restos de papel arrancado; encima se pegan hojas de papel real,
impresas en tintas planas, apenas torcidas, apenas fuera de registro.

La densidad es alta y el tono es directo. Cada afiche dice una cosa y la dice
en grande; el texto de apoyo va abajo, en cuerpo legible, sin adornos. El color
no decora: identifica. Magenta es la voz de ANC, amarillo es la acción del
productor, turquesa es la plata que llega. El material se genera en el
navegador —fibra de papel, bordes rasgados, tinta corrida— y nunca con una
foto de stock.

Rechazos confirmados por el usuario: la estructura de landing de SaaS
(diagramas explicativos, tarjetas de vidrio, tablas de features), las piezas 3D
abstractas, las fotografías de banco de imágenes, y el lila genérico que usan
el resto de las ticketeras chilenas.

**Key Characteristics:**
- Papel sobre muro: todo contenido vive dentro de una hoja pegada.
- Cero radios: el papel se corta y se rasga, no se redondea.
- Tintas planas rationadas: nunca más de dos tintas por afiche.
- Material procedural, nunca fotográfico.
- Un solo momento de movimiento por pantalla.

## Colors

Cuatro tintas de serigrafía sobre papel crudo, pegadas a un muro de hormigón de
noche.

### Primary
- **Magenta de Afiche** (`#ff206e`): la voz de ANC. Afiche del hero, subrayados
  de navegación, la flecha del recorrido del dinero, el foco del scrollbar. Es
  la tinta que firma; nunca se usa como fondo de una sección completa.

### Secondary
- **Amarillo de Corchete** (`#fbff12`): la acción del productor. Solo aparece en
  los dos afiches donde se publica una fecha (el de registro y el de cierre).
  Su escasez es lo que lo hace un botón.

### Tertiary
- **Turquesa de Caja** (`#41ead4`): la plata que llega. Afiche de "cae en tu
  cuenta", paso de Mercado Pago, y el fantasma del registro corrido en los
  titulares.

### Neutral
- **Papel Crudo** (`#ece7dc`): el papel de todos los afiches y el color del
  texto sobre tinta oscura. Lleva fibra procedural multiplicada encima.
- **Papel Apagado** (`#8f8877`): texto secundario sobre el muro, pie de página.
- **Muro** (`#0c0b0a`): el hormigón. Es el único fondo de página que existe.
- **Tinta Negra** (`#090909`): texto sobre papel y sobre tintas claras; fondo de
  los botones.
- **Charcoal** (`#222222`): la cabecera de la aplicación autenticada, fuera del
  muro.

### Named Rules
**La Regla de las Dos Tintas.** Un afiche se imprime en una tinta de fondo y una
de texto. La tercera tinta solo entra como registro corrido (el fantasma
turquesa) o como sello, nunca como un tercer bloque de color.

**La Regla del Amarillo.** El amarillo es la acción del productor. Si un
elemento amarillo no lleva a publicar una fecha, está mal pintado.

## Typography

**Display Font:** Anton (con `Arial Narrow` de respaldo)
**Body Font:** Geist Sans (con `system-ui`)
**Label/Mono Font:** Geist Mono

**Character:** Una condensada de cartel de fiesta contra una grotesca neutral.
La condensada grita desde el muro; la grotesca explica de cerca. La condensada
ya trae su propio apretado óptico, así que el tracking se mantiene casi en cero
(`-0.005em`): el tracking negativo agresivo hace que las letras se toquen.

### Hierarchy
- **Display** (400, `clamp(3rem, 8.2vw, 6.4rem)`, 0.84): el titular del afiche
  del hero. Uno por página.
- **Headline** (400, `clamp(2.4rem, 6vw, 4.6rem)`, 0.84): el titular de cada
  sección, pintado directo sobre el muro, sin papel debajo.
- **Title** (400, `2.4rem`, 0.84): el titular dentro de un afiche.
- **Body** (400, `1.125rem`, 1.75): el texto de apoyo. Máximo 62ch.
- **Label** (700, `0.75rem`, `0.14em`, mayúsculas): fechas, códigos de entrada,
  metadatos. Siempre en mono.

### Named Rules
**La Regla del Registro Corrido.** Una palabra por pantalla puede imprimirse dos
veces, desplazada `-0.035em`, en turquesa multiplicada sobre magenta. Dos ya es
un efecto.

**La Regla del Nombre Ajeno.** El título de un evento es del productor: se
compone en la tipografía del sistema pero nunca se fuerza a mayúsculas.

## Layout

Contenedor centrado que se estrecha según el peso del contenido: `max-w-7xl`
para el muro del hero, `max-w-6xl` para grillas de tres, `max-w-5xl` para
recorridos de dos, `max-w-4xl` para la sección de arranque. El ritmo vertical es
`py-20` en móvil y `py-28` en escritorio (`112px`), con `px-5 / sm:px-8 /
lg:px-12` de gutter.

El hero es una grilla de `1.35fr / 0.65fr` en escritorio —afiche grande a la
izquierda, afiche de acción a la derecha— y una sola columna apilada bajo
`1024px`. Las grillas de pasos son de tres columnas desde `md`, una debajo. El
recorrido del dinero es `1fr auto 1fr` desde `sm`, con la flecha rotada 90° en
móvil para que siga apuntando hacia donde va la lectura.

Cada afiche lleva su propia inclinación entre `-1.6deg` y `1.4deg` vía la
variable `--rot`, que la animación de entrada preserva. Nada se alinea perfecto
con nada: el muro no es una grilla.

## Elevation & Depth

No hay elevación de material design. La profundidad es física: un afiche está
encima de otro porque se pegó después. La única sombra del sistema es la que
proyecta una hoja de papel sobre el muro, y va aplicada a la hoja —nunca al
contenido— junto al filtro de rasgado.

### Shadow Vocabulary
- **Papel sobre muro** (`drop-shadow(7px 11px 14px rgb(0 0 0 / 0.6))`): la
  sombra de una hoja pegada. Desplazada en diagonal, nunca centrada.
- **Esquina despegada** (`linear-gradient(135deg, transparent 48%, rgb(0 0 0 /
  0.45) 100%)`): la sombra que se abre desde una esquina suelta.
- **Cinta y corchete** (`0 2px 5px rgb(0 0 0 / 0.4)` y `0 1px 2px rgb(0 0 0 /
  0.6)`): el objeto que sostiene el papel al muro.

### Named Rules
**La Regla de la Hoja.** El filtro de rasgado va sobre el `<span class="sheet">`
que está detrás del contenido, nunca sobre el contenido. Un texto desplazado por
turbulencia es un texto roto.

## Shapes

Radio cero en todo el sistema. El papel no tiene esquinas redondeadas: tiene
bordes rasgados, generados con `feTurbulence` + `feDisplacementMap` (`#torn-edge`
a escala 11, `#torn-edge-soft` a escala 7). Un polígono de puntas no es un
rasgado; la irregularidad tiene que venir del ruido.

Las perforaciones —el talón de la entrada, el bloque del QR— se hacen con
máscaras de `repeating-linear-gradient`, no con imágenes ni con bordes
punteados. El sello de goma lleva una máscara de turbulencia para que la tinta
nunca salga pareja.

## Components

### Buttons
- **Shape:** rectángulo exacto (`border-radius: 0`).
- **Primary:** tinta negra `#090909` sobre papel, texto en papel crudo
  `#ece7dc`, tipografía de afiche, `20px 32px`.
- **Hover / Focus:** el fondo sube a `#1d1d1d` en 100ms; `active` baja a
  `scale(.98)`. El foco visible es un contorno amarillo de `3px` con `3px` de
  separación, en toda la aplicación.
- **Secondary:** enlace de texto con subrayado magenta de `2px`, que se tiñe de
  magenta al pasar por encima.

### Cards / Containers
No hay tarjetas: hay afiches. Un afiche es un contenedor con
`position: relative; isolation: isolate` que envuelve un `<span class="sheet">`
absoluto en `z-index: -1`. La hoja lleva el color de tinta, la fibra del papel,
el rasgado y la sombra; el contenido va encima, nítido. El padding interno es
`24px` horizontal y `36px` vertical; los afiches del hero y de cierre suben a
`48px / 80px`.

### Inputs / Fields
Campos sobre papel: fondo `#ece7dc`, borde inferior de tinta negra de `2px`, sin
radio. El foco usa el mismo contorno amarillo del sistema. El error se imprime
en `#7a0f2e` con `role="alert"`, dentro del mismo afiche, nunca como toast.

### Navigation
La marca es un afiche pequeño de papel pegado arriba a la izquierda, con el
isotipo y el nombre en tipografía de afiche sobre tinta negra. El enlace de
sesión va arriba a la derecha, sin papel, subrayado en magenta. En la aplicación
autenticada la cabecera sale del muro: bloque `#222222` con un remate de `3px`
de magenta abajo.

### Afiche que se arranca (componente firma)
La sección de comisión apila dos afiches. A medida que la sección sube por el
viewport, una máscara de gradiente levanta el afiche de arriba —"Comisión de
plataforma"— y deja ver el de abajo, en magenta: `$0`. El progreso se calcula en
un `requestAnimationFrame` sobre `getBoundingClientRect`, nunca en estado de
React por frame. Con `prefers-reduced-motion` el afiche aparece ya arrancado.

## Do's and Don'ts

### Do:
- **Do** envolver todo contenido en un afiche: un `<span class="sheet">` detrás
  y el texto encima.
- **Do** inclinar cada afiche con `--rot` entre `-1.6deg` y `1.4deg`, y
  preservar esa rotación en la animación de entrada.
- **Do** elegir el color del texto según la tinta del papel (`#ece7dc` sobre
  magenta, `#062622` sobre turquesa, `#090909` sobre amarillo).
- **Do** generar el material con SVG y CSS: fibra, rasgado, sello, perforación.
- **Do** dejar el contenido visible por defecto y esconderlo solo bajo
  `.motion-on`, para que un fallo de script nunca deje la página en blanco.
- **Do** respetar `prefers-reduced-motion` en cada momento de movimiento.

### Don't:
- **Don't** usar `border-radius` en ninguna parte del muro.
- **Don't** aplicar el filtro de rasgado sobre texto o sobre un contenedor con
  texto: va sobre la hoja de atrás.
- **Don't** usar fotografías de banco de imágenes. El único material fotográfico
  aprobado es el video del hero y las imágenes que suba el productor.
- **Don't** pintar una sección completa de magenta, amarillo o turquesa: las
  tintas se rationan a los afiches.
- **Don't** inventar prueba social —cifras de ventas, testimonios, logos de
  productoras—: el producto está en pre-lanzamiento y no existe.
- **Don't** prometer $0 sin la letra chica: el organizador no paga comisión de
  plataforma, el comprador paga un cargo por servicio del 10%.
- **Don't** usar curvas de rebote o elásticas; el movimiento decelera con
  `cubic-bezier(0.16, 1, 0.3, 1)`.
