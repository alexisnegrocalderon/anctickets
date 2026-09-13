---
name: ANC Tickets
description: La ticketera chilena donde el productor cobra directo, sin comisión de plataforma.
colors:
  bg: "#ffffff"
  cream: "#fff3ea"
  violet: "#dfa3ff"
  violet-deep: "#9333ea"
  yellow: "#ffc72c"
  cerise: "#f400a1"
  cerise-deep: "#b3007a"
  ink: "#0b1120"
  ink-muted: "#55536b"
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
  section-y: "128px"
  card-p: "32px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "#f5b800"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "{spacing.card-p}"
---

# Design System: ANC Tickets

> **Nota de estado:** la estructura de abajo (hero de impacto, quiebres de
> pantalla completa, playbook en grilla, metodología 01-06, carrusel
> horizontal) es la vigente. La sección Colors sigue describiendo la paleta
> "Doughlicious" provisoria — el usuario va a mandar una referencia de color
> nueva para esta misma estructura, así que solo esa sección quedará
> desactualizada hasta la próxima ronda.

## Overview

**Creative North Star: "El Puesto de Feria, Vendiendo Directo"**

ANC Tickets vende sin intermediarios, y la página ahora lo dice con la
energía de un puesto de feria bien pintado, no con una landing corporativa
monocroma. La estructura sigue siendo de conversión (hero, beneficios, cómo
funciona, precio, FAQ, cierre); lo que cambió es que cada sección lleva su
propio color en vez de repetir blanco hasta el final. El nav es violeta
pálido, "cómo funciona" es un bloque violeta completo, "beneficios" y "FAQ"
son crema cálido, "fechas publicadas" es negro perla, y el cierre es cerise
vibrante — cuatro colores de marca que se turnan en vez de vivir todos
mezclados en cada pantalla.

El amarillo mikado es el único color de acción: aparece en cada botón que
lleva a publicar un evento, sin importar sobre qué color de sección esté
parado, porque su trabajo es ser reconocible siempre. El cerise y el violeta
oscuro son los dos acentos de texto (kickers, subrayados, números
fantasma); el violeta pálido y el negro perla son, además de acentos,
colores de fondo de sección completos.

En pre-lanzamiento no existe prueba social real, así que la página nunca
inventa logos, testimonios o cifras de ventas. En su lugar, la sección de
precio muestra una calculadora en vivo que reparte cualquier monto que el
productor escriba: eso es la prueba, no una promesa.

**Key Characteristics:**
- Cada sección tiene su propio color de fondo (violeta, crema, blanco, negro
  perla, cerise) en vez de un blanco continuo.
- Amarillo mikado es el único color de botón de acción, en cualquier sección.
- Cerise oscuro y violeta oscuro son los dos acentos de texto/kicker.
- Elevación con sombra suave + borde índigo al 12-15% sobre fondos claros.
- Cero prueba social fabricada; el reparto de la plata es la prueba.

## Colors

Violeta pálido, crema, amarillo mikado, cerise y negro perla — la paleta
"Doughlicious" adaptada a una ticketera.

### Primary
- **Violeta Pálido** (`#dfa3ff` superficie / `#9333ea` texto): el nav
  completo y el bloque de "cómo funciona". Es el color que más aparece como
  fondo de sección.

### Secondary
- **Amarillo Mikado** (`#ffc72c`): el único color de botón de acción (Google
  OAuth / publicar). Nunca se usa como texto por su bajo contraste sobre
  blanco; solo como fondo de botón, borde de énfasis o remate de header.

### Tertiary
- **Cerise Hollywood** (`#f400a1` superficie / `#b3007a` texto): el bloque de
  cierre, el punto flotante de la tarjeta del hero, y uno de los dos acentos
  de texto/kicker.

### Neutral
- **Blanco** (`#ffffff`): hero, precio, cierre (contenedor de la sección).
- **Crema** (`#fff3ea`): beneficios y FAQ — el "papel" cálido del sistema.
- **Negro Perla** (`#0b1120`): fondo de "fechas publicadas" y todo texto
  principal sobre fondo claro.
- **Índigo Apagado** (`#55536b`): todo el texto de apoyo/cuerpo.
- **Borde** (`rgba(11,17,32,.14)`): el único borde del sistema sobre fondos claros.

### Named Rules
**La Regla del Amarillo.** El amarillo solo aparece en botones que llevan a
publicar un evento — nunca como texto, nunca decorativo.

**La Regla de la Sección de Color.** Cada sección principal tiene un único
color de fondo de la paleta; no se mezclan dos colores de sección en el mismo
bloque.

**La Regla de la Prueba Real.** Ninguna cifra de ventas, logo de cliente o
testimonial se muestra sin ser real. Mientras no exista, la sección de precio
lo reemplaza con la calculadora de reparto.

## Typography

**Display Font:** Anton (con `Arial Narrow` de respaldo)
**Body Font:** Geist Sans
**Label/Mono Font:** Geist Mono

### Hierarchy
- **Display** (400, `clamp(2.6rem,6.4vw,5rem)`, 0.94): el titular del hero.
- **Headline** (400, `clamp(2rem,4.6vw,3.4rem)`, 0.98): titular de cada sección.
- **Title** (400, `clamp(1.7rem,3.4vw,2.6rem)`, 1.02): titular de un beneficio o paso.
- **Body** (400, `1rem`, 1.6): texto de apoyo, máximo 62ch.
- **Label** (700, `0.7rem`, `0.18em`, mayúsculas mono, cerise oscuro o violeta
  oscuro según la sección): kickers y metadatos.

## Layout

Estructura editorial de agencia (inspirada en loveandmoney.com), no landing
de SaaS convencional: hero de impacto a pantalla completa → franja de
confianza → quiebre de impacto → playbook en grilla → metodología numerada →
quiebre de impacto → precio/calculadora → carrusel horizontal de fechas →
FAQ → cierre.

Contenedor `max-w-7xl` para el nav, `max-w-6xl` para el playbook y el
carrusel, `max-w-4xl` para la metodología, `max-w-3xl` para encabezados de
sección centrados, `max-w-2xl` para la calculadora. Ritmo vertical `py-24` en
móvil, `py-32` en escritorio, con `px-5 / sm:px-8 / lg:px-12` de gutter.

### Componentes editoriales
- **`ImpactSection`**: pantalla completa (`min-h-[80svh]`), texto centrado
  grande sobre video o color sólido, con un parallax leve del fondo
  (`translateY` + `scale(1.12)` vía rAF, nunca layout) que se desactiva por
  completo con `prefers-reduced-motion`. Se usa tres veces: el hero y dos
  quiebres de una sola frase entre secciones de contenido.
- **`PlaybookGrid`**: grilla 2/3 columnas de capacidades del producto, cada
  una con un placeholder de imagen y una etiqueta corta. Reemplaza las
  tarjetas de "beneficios" de la ronda anterior.
- **`Methodology`**: lista numerada 01-06 con la mecánica real del producto
  (cuenta → Mercado Pago → publicar → compartir → vender → controlar la
  puerta), en formato manifiesto editorial en vez de tres tarjetas cortas.
- **`EventCarousel`**: scroll-snap horizontal nativo con swipe/drag (no
  scroll-jack — más robusto en móvil y trackpad) para las fechas publicadas,
  sobre la sección de fondo negro perla.

## Elevation & Depth

Sombra suave y difusa más un borde índigo al 12-15% sobre fondos claros. Sobre
el fondo negro perla ("fechas publicadas") la separación es por opacidad de
blanco (`bg-white/[.06]`, borde `white/15`), no por sombra.

## Shapes

Radios generosos: `16px` en tarjetas de beneficio y pasos, `24px` en la
calculadora, `32px` en el bloque de cierre, píldora completa (`9999px`) en
todos los botones y CTAs.

## Components

### Buttons
- **Primary (publicar):** fondo amarillo mikado `#ffc72c`, texto negro perla,
  mayúsculas, píldora completa, `16px 28px`. Es el único botón de acción del
  sistema, en nav, hero y cierre, sobre cualquier color de fondo.

### Cards / Containers
- **Background:** blanco sobre secciones claras; `white/[.06]` sobre la
  sección negro perla.
- **Shadow Strategy:** sombra suave + borde (ver Elevation).

### Calculadora de reparto (componente firma)
Sustituye a la prueba social que no existe. El productor escribe cualquier
precio y ve, en tiempo real, cuánto paga el comprador, cuánto cae en su cuenta
(resaltado con borde amarillo) y la diferencia explicada en una frase.

## Do's and Don'ts

### Do:
- **Do** usar amarillo mikado únicamente en botones de acción.
- **Do** dar a cada sección principal un único color de fondo de la paleta.
- **Do** usar cerise oscuro (`#b3007a`) o violeta oscuro (`#9333ea`) para
  cualquier texto de acento, nunca sus versiones claras.
- **Do** mostrar el 100% del precio publicado cayendo en la cuenta del
  productor en cualquier lugar donde se hable de plata.
- **Do** respetar `prefers-reduced-motion`.

### Don't:
- **Don't** fabricar logos, testimonios o cifras de ventas.
- **Don't** usar amarillo como color de texto: falla contraste sobre blanco.
- **Don't** mezclar dos colores de fondo de sección en el mismo bloque.
- **Don't** prometer $0 sin la letra chica del cargo por servicio del 10%.
- **Don't** usar curvas de rebote o elásticas; el movimiento decelera con
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Don't** usar fotografías de banco de imágenes; los espacios de imagen se
  marcan como pendientes hasta tener el asset real del productor.
