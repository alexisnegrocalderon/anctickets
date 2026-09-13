---
name: ANC Tickets
description: La ticketera chilena donde el productor cobra directo, sin comisión de plataforma.
colors:
  bg: "#ffffff"
  ink: "#1d1d1d"
  muted: "#808080"
  vermilion: "#fc4c13"
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
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "#e0430e"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "{spacing.card-p}"
---

# Design System: ANC Tickets

## Overview

**Creative North Star: "El Set de Rodaje, Vendiendo Directo"**

ANC Tickets vende sin intermediarios, y la página ahora lo dice con la
misma economía gráfica de un fotograma de rodaje: casi-negro cálido,
un único acento de fuego, y blanco puro para respirar. La estructura es
editorial (hero de impacto, quiebres de pantalla completa, playbook,
metodología, carrusel), y el color se raciona igual de estricto que la
estructura: solo cuatro tonos, cada uno con un trabajo fijo.

Cod Gray es el lienzo — domina el hero, los dos quiebres de impacto que lo
necesitan, el carrusel de fechas y el cierre. Vermilion es el único acento:
aparece en cada botón que lleva a publicar un evento, en los kickers, y en
uno de los dos quiebres de impacto como bloque de color completo — nunca
decora dos veces en la misma pantalla. Blanco es el respiro entre esos
momentos oscuros: el playbook, la metodología, el precio y el FAQ vuelven a
él para que el ojo descanse antes del siguiente golpe de color. Gray es la
única voz de apoyo, discreta a propósito.

En pre-lanzamiento no existe prueba social real, así que la página nunca
inventa logos, testimonios o cifras de ventas. En su lugar, la sección de
precio muestra una calculadora en vivo que reparte cualquier monto que el
productor escriba: eso es la prueba, no una promesa.

**Key Characteristics:**
- Cuatro colores, cada uno con un solo trabajo: Cod Gray = lienzo oscuro,
  Vermilion = acento de acción, Blanco = respiro/sección clara, Gray = apoyo.
- Los quiebres de impacto alternan Cod Gray (hero) → Vermilion → Blanco,
  nunca repiten el mismo color dos veces seguidas.
- El botón de acción es siempre Vermilion con texto Cod Gray, sobre
  cualquier fondo — nunca vermilion sobre vermilion.
- Elevación con sombra suave + borde Cod Gray al 14% sobre fondos claros;
  opacidad de blanco sobre fondos oscuros.
- Cero prueba social fabricada; el reparto de la plata es la prueba.

## Colors

Vermilion, Cod Gray, Gray y Blanco — cuatro colores, cero mezcla.

### Primary
- **Cod Gray** (`#1d1d1d`): el lienzo. Fondo del nav, el hero, el carrusel
  de fechas y el cierre; texto principal sobre cualquier sección clara.

### Secondary
- **Vermilion** (`#fc4c13`): el único acento de acción. Todo botón que lleva
  a publicar un evento, los kickers de sección, y un quiebre de impacto
  completo. Nunca se usa como texto de cuerpo (contraste insuficiente sobre
  blanco); como texto solo en kickers/mono en tamaño pequeño-bold sobre
  blanco, o como fondo de botón/bloque con texto Cod Gray encima.

### Neutral
- **Blanco** (`#ffffff`): el respiro. Playbook, metodología, precio, FAQ, y
  uno de los dos quiebres de impacto.
- **Gray** (`#808080`): texto de apoyo corto (captions, líneas secundarias).
  Los párrafos largos (FAQ, subtítulos de hero) usan Cod Gray a menor
  opacidad en vez de este gris, porque a mayor longitud de texto el
  contraste 3.95:1 de este gris sobre blanco se vuelve difícil de leer.
- **Borde** (`rgba(29,29,29,.14)` sobre fondos claros / `rgba(255,255,255,.15)`
  sobre fondos oscuros): el único borde del sistema.

### Named Rules
**La Regla del Acento Único.** Vermilion es el único color con función de
"acción". Si un botón, kicker o CTA no es vermilion, no es una acción.

**La Regla de la No Colisión.** Un botón vermilion nunca vive sobre un fondo
vermilion. El bloque de cierre y el carrusel usan Cod Gray precisamente para
que el botón vermilion encima siga siendo visible.

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
- **Label** (700, `0.7rem`, `0.18em`, mayúsculas mono, siempre Vermilion):
  kickers y metadatos.

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

Sombra suave y difusa más un borde Cod Gray al 14% sobre fondos claros. Sobre
las secciones Cod Gray (carrusel de fechas, cierre) la separación es por
opacidad de blanco (`bg-white/[.06]`, borde `white/15`), no por sombra.

## Shapes

Radios generosos: `16px` en tarjetas de beneficio y pasos, `24px` en la
calculadora, `32px` en el bloque de cierre, píldora completa (`9999px`) en
todos los botones y CTAs.

## Components

### Buttons
- **Primary (publicar):** fondo Vermilion `#fc4c13`, texto Cod Gray,
  mayúsculas, píldora completa, `16px 28px`. Es el único botón de acción del
  sistema, en nav, hero y cierre, sobre cualquier color de fondo — nunca
  sobre un fondo vermilion (ver La Regla de la No Colisión).

### Cards / Containers
- **Background:** blanco sobre secciones claras; `white/[.06]` sobre las
  secciones Cod Gray.
- **Shadow Strategy:** sombra suave + borde (ver Elevation).

### Calculadora de reparto (componente firma)
Sustituye a la prueba social que no existe. El productor escribe cualquier
precio y ve, en tiempo real, cuánto paga el comprador, cuánto cae en su cuenta
(resaltado con borde vermilion) y la diferencia explicada en una frase.

## Do's and Don'ts

### Do:
- **Do** usar Vermilion únicamente para acción (botones, kickers) o como
  bloque de color completo en un quiebre de impacto — nunca ambos usos en la
  misma pantalla.
- **Do** poner el botón de acción sobre Cod Gray o Blanco, nunca sobre
  Vermilion.
- **Do** reservar Gray para texto de apoyo corto; usar Cod Gray a menor
  opacidad para párrafos largos.
- **Do** mostrar el 100% del precio publicado cayendo en la cuenta del
  productor en cualquier lugar donde se hable de plata.
- **Do** respetar `prefers-reduced-motion`.

### Don't:
- **Don't** fabricar logos, testimonios o cifras de ventas.
- **Don't** poner un botón o texto vermilion sobre un fondo vermilion.
- **Don't** introducir un quinto color: el sistema es exactamente estos cuatro.
- **Don't** prometer $0 sin la letra chica del cargo por servicio del 10%.
- **Don't** usar curvas de rebote o elásticas; el movimiento decelera con
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Don't** usar fotografías de banco de imágenes; los espacios de imagen se
  marcan como pendientes hasta tener el asset real del productor.
