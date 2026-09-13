---
name: ANC Tickets
description: La ticketera chilena donde el productor cobra directo, sin comisión de plataforma.
colors:
  accent-magenta: "#ff206e"
  accent-yellow: "#fbff12"
  accent-turquoise: "#41ead4"
  charcoal: "#222222"
  ink: "#090909"
  warm-white: "#f5f4f1"
  bg-base: "#0c0b0a"
  bg-raised: "#111010"
  bg-card: "#161616"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 6.4vw, 5rem)"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 0.98
  title:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)"
    fontWeight: 400
    lineHeight: 1.02
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.18em"
rounded:
  sm: "16px"
  md: "24px"
  lg: "32px"
  pill: "9999px"
spacing:
  section-y: "112px"
  card-p: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "#fdffb0"
  button-secondary:
    backgroundColor: "{colors.accent-magenta}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.sm}"
    padding: "{spacing.card-p}"
---

# Design System: ANC Tickets

## Overview

**Creative North Star: "El Panel del Productor Convertido en Vitrina"**

ANC Tickets es la herramienta con la que un productor chileno vende sus propias
entradas y cobra directo. El home ya no es un mundo de fantasía (afiches
pegados en un muro): es una página de conversión clásica y probada —hero con
promesa y CTA, beneficios, cómo funciona, prueba de reparto, preguntas
frecuentes, cierre— que usa la estructura que mejor convierte en el mercado
de ticketeras de LatAm, vestida enteramente con la identidad de marca de ANC.

La superficie es charcoal casi negro (`#0c0b0a`) con tarjetas oscuras
ligeramente más claras (`#161616`) para separar contenido sin usar bordes
duros. El color vive en tres tintas planas —magenta, amarillo, turquesa— que
identifican, no decoran: magenta es la voz de la marca y los CTAs primarios
de navegación, amarillo es la acción de publicar un evento, turquesa marca
datos de confianza y kickers. Todo texto de apoyo va en gris neutro sobre el
fondo oscuro para mantener el contraste sin subir el volumen de color.

En pre-lanzamiento no existe prueba social real, así que la página nunca
inventa logos, testimonios o cifras de ventas. En su lugar, la sección de
precio muestra una calculadora en vivo que reparte cualquier monto que el
productor escriba: eso es la prueba, no una promesa.

**Key Characteristics:**
- Estructura de conversión: hero, beneficios, cómo funciona, precio, FAQ, cierre.
- Tarjetas oscuras redondeadas en vez de bordes o superficies planas.
- Tres tintas de acento rationadas por función, no decorativas.
- Cero prueba social fabricada; el reparto de la plata es la prueba.
- Un solo momento de movimiento (`.reveal`) por elemento, con red de seguridad
  si el observador de scroll no dispara.

## Colors

Charcoal casi negro con tres tintas planas de acento.

### Primary
- **Magenta ANC** (`#ff206e`): la voz de la marca. CTA secundario, subrayados,
  kickers de la primera y tercera sección, el bloque de cierre.

### Secondary
- **Amarillo de Acción** (`#fbff12`): el botón de publicar un evento, en
  cualquier parte de la página. Su escasez es lo que lo hace reconocible como
  la acción principal.

### Tertiary
- **Turquesa de Confianza** (`#41ead4`): kickers de secciones de confianza
  (cómo funciona, la tarjeta "a tu Mercado Pago" en la calculadora).

### Neutral
- **Blanco Cálido** (`#f5f4f1`): texto principal sobre fondo oscuro.
- **Gris de Apoyo** (`neutral-400/500`, Tailwind): texto secundario, cuerpo.
- **Base** (`#0c0b0a`): fondo de página.
- **Elevado** (`#111010`): fondo de secciones alternas (cómo funciona, fechas).
- **Tarjeta** (`#161616` / `#1c1c1c`): fondo de tarjetas y bloques de datos.

### Named Rules
**La Regla del Amarillo.** El amarillo solo aparece en botones que llevan a
publicar un evento (login/signup). Si un botón amarillo no hace eso, está mal
pintado.

**La Regla de la Prueba Real.** Ninguna cifra de ventas, logo de cliente o
testimonial se muestra sin ser real. Mientras no exista, la sección de precio
lo reemplaza con la calculadora de reparto.

## Typography

**Display Font:** Anton (con `Arial Narrow` de respaldo)
**Body Font:** Geist Sans
**Label/Mono Font:** Geist Mono

**Character:** Una condensada de alto impacto para headlines cortos y directos,
contra una grotesca neutral para todo lo explicativo. El tracking de la
condensada se mantiene casi en cero (global, vía `h1,h2,h3,.font-display`) para
que las letras no se toquen.

### Hierarchy
- **Display** (400, `clamp(2.6rem,6.4vw,5rem)`, 0.94): el titular del hero.
- **Headline** (400, `clamp(2rem,4.6vw,3.4rem)`, 0.98): titular de cada sección.
- **Title** (400, `clamp(1.7rem,3.4vw,2.6rem)`, 1.02): titular de un beneficio o paso.
- **Body** (400, `1rem`, 1.6): texto de apoyo, máximo 62ch.
- **Label** (700, `0.7rem`–`0.75rem`, `0.14em`–`0.2em`, mayúsculas mono): kickers,
  metadatos, etiquetas de tarjeta. Este es el único lugar del sistema donde un
  tamaño por debajo de 12px es intencional.

## Layout

Contenedor `max-w-7xl` para hero y nav, `max-w-6xl` para grillas de beneficios
y pasos, `max-w-3xl` para encabezados de sección centrados, `max-w-2xl` para la
calculadora. Ritmo vertical `py-20` en móvil, `py-28` en escritorio (112px),
con `px-5 / sm:px-8 / lg:px-12` de gutter.

El hero es `1.1fr / 0.9fr` en escritorio (texto y CTA a la izquierda, imagen a
la derecha), una columna en móvil. Los beneficios alternan imagen
izquierda/derecha por índice. Los pasos y las fechas publicadas son grillas de
3 columnas que colapsan a 1.

## Elevation & Depth

Capas tonales, no sombras duras. El fondo sube un tono por sección (`#0c0b0a`
→ `#111010`) para separar bloques sin bordes, y las tarjetas suben otro tono
más (`#161616` / `#1c1c1c`). El único borde vivo es blanco al 10% de opacidad,
usado para separar el nav y las tarjetas de beneficios entre sí.

### Named Rules
**La Regla de las Capas.** La profundidad se logra subiendo el tono de fondo,
nunca con `box-shadow`. La excepción es el borde de foco amarillo
(accesibilidad) y el aro de foco distintivo de la tarjeta "a tu Mercado Pago".

## Shapes

Radios generosos y consistentes: `16px` en tarjetas de beneficio y placeholders
de imagen, `24px` en tarjetas de contenido (calculadora, pasos), `32px` en el
bloque de cierre, píldora completa (`9999px`) en todos los botones y CTAs.
Nada de esquinas vivas: es lo opuesto al mundo de "papel rasgado" que tuvo el
sitio antes.

## Components

### Buttons
- **Shape:** píldora completa.
- **Primary (publicar):** fondo amarillo `#fbff12`, texto `#160f00`, mayúsculas,
  `16px 28px`. Usado para toda acción que lleva a Google OAuth / publicar.
- **Secondary (nav):** fondo magenta `#ff206e`, texto blanco cálido, más
  compacto, para el CTA de la barra de navegación.
- **Hover / Focus:** brillo +5-10% en hover, `scale(.95-.98)` en active. El
  foco visible es un contorno amarillo de `3px` con `3px` de separación.

### Cards / Containers
- **Corner Style:** `16px`–`24px` según el contexto.
- **Background:** `#161616` sobre el fondo base, `#1c1c1c` para el nivel
  interior (dentro de la calculadora).
- **Shadow Strategy:** ninguna; la separación es tonal.
- **Border:** solo blanco 10% en tarjetas de beneficio; ninguno en tarjetas de
  datos.

### Inputs / Fields
- **Style:** subrayado de `2px` sobre fondo transparente (precio de la
  calculadora), sin caja.
- **Focus:** el subrayado cambia a amarillo.

### Accordion (FAQ)
- Filas separadas por un borde blanco al 10%, ícono `+` que rota 45° al abrir,
  transición de `grid-template-rows` para el alto animado en vez de `height`
  fijo o `max-height` adivinado.

### Calculadora de reparto (componente firma)
Sustituye a la prueba social que no existe. El productor escribe cualquier
precio y ve, en tiempo real, cuánto paga el comprador, cuánto cae en su cuenta
(el 100% de lo que publicó) y la diferencia explicada en una frase, sin
esconder que Mercado Pago y ANC se quedan con parte del cargo de servicio.

## Do's and Don'ts

### Do:
- **Do** usar píldora completa en todos los botones y CTAs.
- **Do** subir el tono de fondo para separar secciones, nunca `box-shadow`.
- **Do** limitar el amarillo a acciones que llevan a publicar un evento.
- **Do** mostrar el 100% del precio publicado cayendo en la cuenta del
  productor en cualquier lugar donde se hable de plata.
- **Do** dejar el contenido visible por defecto y esconderlo solo bajo
  `.motion-on`, para que un fallo de script nunca deje la página en blanco.
- **Do** respetar `prefers-reduced-motion`.

### Don't:
- **Don't** fabricar logos, testimonios o cifras de ventas: el producto está
  en pre-lanzamiento.
- **Don't** usar `border-radius: 0` ni bordes rasgados — ese mundo se
  reemplazó por uno de conversión clásica con esquinas suaves.
- **Don't** prometer $0 sin la letra chica: el organizador no paga comisión de
  plataforma, el comprador paga un cargo por servicio del 10%.
- **Don't** usar curvas de rebote o elásticas; el movimiento decelera con
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Don't** usar fotografías de banco de imágenes; los espacios de imagen se
  marcan como pendientes hasta tener el asset real del productor.
