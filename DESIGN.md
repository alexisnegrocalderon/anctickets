---
name: ANC Tickets
description: La ticketera chilena donde el productor cobra directo, sin comisión de plataforma.
colors:
  bg: "#ffffff"
  bg-soft: "#f7f5fc"
  ink: "#1e1b4b"
  ink-muted: "#57567c"
  lime: "#a3e635"
  lime-deep: "#65a30d"
  purple: "#c084fc"
  purple-deep: "#7c3aed"
  card: "#f6f4fc"
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
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "#b8ee52"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "{spacing.card-p}"
---

# Design System: ANC Tickets

## Overview

**Creative North Star: "El Panel del Productor, en Blanco y Vivo"**

ANC Tickets vende sin intermediarios, y la página lo dice sobre un fondo
blanco de estudio, no sobre una superficie oscura de rave. La estructura
sigue siendo de conversión (hero, beneficios, cómo funciona, precio, FAQ,
cierre); lo que cambió es el vestuario: índigo oscuro para todo el texto y
los titulares, lima como el único color de acción (todo botón que publica un
evento), y violeta suave como el acento de confianza y los datos de kicker.

El fondo blanco se rompe con paneles muy suaves (`#f7f5fc`) para separar
secciones sin oscurecer nada, y con un solo bloque índigo oscuro sólido al
cierre —el único lugar de la página que invierte el contraste— para que el
CTA final se sienta como un evento, no como una fila más. Las tarjetas usan
sombra suave y borde índigo al 12% en vez de bordes duros: es una superficie
de estudio, con profundidad de papel, no de club nocturno.

En pre-lanzamiento no existe prueba social real, así que la página nunca
inventa logos, testimonios o cifras de ventas. En su lugar, la sección de
precio muestra una calculadora en vivo que reparte cualquier monto que el
productor escriba: eso es la prueba, no una promesa.

**Key Characteristics:**
- Fondo blanco con paneles lavanda muy suaves para el ritmo de sección.
- Un solo bloque índigo oscuro sólido, reservado para el cierre.
- Lima es el único color de acción; violeta es el único color de confianza.
- Elevación con sombra suave + borde índigo al 12%, no con capas tonales oscuras.
- Cero prueba social fabricada; el reparto de la plata es la prueba.

## Colors

Blanco de estudio con dos acentos: uno de acción, uno de confianza.

### Primary
- **Índigo de Marca** (`#1e1b4b`): todo titular, todo texto principal, y el
  único fondo sólido de la página (el bloque de cierre).

### Secondary
- **Lima de Acción** (`#a3e635` fondo / `#65a30d` texto): el único color de
  botón que lleva a publicar un evento (Google OAuth). Si un elemento lima no
  hace eso, está mal pintado.

### Tertiary
- **Violeta de Confianza** (`#c084fc` superficie / `#7c3aed` texto): kickers
  de sección, badges y el borde del marco de video del hero. La versión clara
  (`#c084fc`) es solo para fondos/bordes; el texto usa siempre la versión
  oscura (`#7c3aed`) por contraste.

### Neutral
- **Blanco** (`#ffffff`): fondo base de toda la página.
- **Lavanda Suave** (`#f7f5fc`): fondo de secciones alternas.
- **Tarjeta** (`#f6f4fc`): fondo de bloques de datos dentro de una tarjeta blanca.
- **Índigo Apagado** (`#57567c`): todo el texto de apoyo/cuerpo.
- **Borde Índigo** (`rgba(30,27,75,.12)`): el único borde del sistema.

### Named Rules
**La Regla del Lima.** El lima solo aparece en botones que llevan a publicar
un evento. Ningún otro elemento —ni siquiera decorativo— se pinta de lima.

**La Regla del Bloque Único.** Solo una sección de la página puede tener
fondo sólido índigo a la vez: el cierre. Usarlo en más de un lugar le quita
el peso al CTA final.

**La Regla de la Prueba Real.** Ninguna cifra de ventas, logo de cliente o
testimonial se muestra sin ser real. Mientras no exista, la sección de precio
lo reemplaza con la calculadora de reparto.

## Typography

**Display Font:** Anton (con `Arial Narrow` de respaldo)
**Body Font:** Geist Sans
**Label/Mono Font:** Geist Mono

**Character:** Una condensada de alto impacto para headlines cortos, contra
una grotesca neutral para todo lo explicativo. El tracking de la condensada
se mantiene casi en cero (global, vía `h1,h2,h3,.font-display`).

### Hierarchy
- **Display** (400, `clamp(2.6rem,6.4vw,5rem)`, 0.94, índigo): el titular del hero.
- **Headline** (400, `clamp(2rem,4.6vw,3.4rem)`, 0.98, índigo): titular de cada sección.
- **Title** (400, `clamp(1.7rem,3.4vw,2.6rem)`, 1.02, índigo): titular de un beneficio o paso.
- **Body** (400, `1rem`, 1.6, índigo apagado): texto de apoyo, máximo 62ch.
- **Label** (700, `0.7rem`, `0.18em`, mayúsculas mono, violeta oscuro o lima
  oscuro según la sección): kickers y metadatos, único lugar bajo 12px.

## Layout

Contenedor `max-w-7xl` para hero y nav, `max-w-6xl` para grillas de beneficios
y pasos, `max-w-3xl` para encabezados de sección centrados, `max-w-2xl` para la
calculadora. Ritmo vertical `py-24` en móvil, `py-32` en escritorio (128px),
con `px-5 / sm:px-8 / lg:px-12` de gutter.

El hero es `1.1fr / 0.9fr` en escritorio: texto y CTA a la izquierda, a la
derecha el video del hero enmarcado en una tarjeta con borde violeta y una
tarjeta flotante blanca superpuesta con el dato de 0% comisión. Una columna en
móvil. Los beneficios alternan imagen izquierda/derecha por índice.

## Elevation & Depth

Sombra suave y difusa (`0 20px 40-60px -20/30px rgba(30,27,75,.3-.4)`) más un
borde índigo al 12%: así se separan las tarjetas del fondo blanco. No hay
capas tonales oscuras —eso pertenecía al sistema anterior— porque sobre blanco
la sombra sí lee como profundidad real.

### Shadow Vocabulary
- **Tarjeta de contenido** (`0 20px 40px -30px rgba(30,27,75,.3)`): pasos, FAQ, tarjetas de fecha.
- **Tarjeta flotante** (`0 20px 40px -20px rgba(30,27,75,.35)`): la tarjeta de dato sobre el video del hero.
- **Marco de video** (`0 30px 60px -30px rgba(30,27,75,.4)`): el contenedor del video del hero.

### Named Rules
**La Regla del Borde Índigo.** Toda tarjeta lleva `border-[var(--anc-border)]`
además de su sombra: la sombra sola se pierde en pantallas muy brillantes.

## Shapes

Radios generosos: `16px` en tarjetas de beneficio y pasos, `24px` en la
calculadora, `32px` en el bloque de cierre, píldora completa (`9999px`) en
todos los botones y CTAs.

## Components

### Buttons
- **Shape:** píldora completa.
- **Primary (publicar):** fondo lima `#a3e635`, texto índigo `#1e1b4b`,
  mayúsculas, `16px 28px`. Es el único botón de acción del sistema, en nav,
  hero y cierre.
- **Hover / Focus:** brillo -5% en hover, `scale(.95-.98)` en active. El foco
  visible es un contorno lima de `3px` con `3px` de separación.

### Cards / Containers
- **Corner Style:** `16px`–`24px` según el contexto.
- **Background:** blanco puro, con `#f6f4fc` para el nivel interior (dentro
  de la calculadora).
- **Shadow Strategy:** sombra suave + borde índigo al 12% (ver Elevation).

### Inputs / Fields
- **Style:** subrayado de `2px` índigo al 15% sobre fondo transparente.
- **Focus:** el subrayado cambia a lima oscuro.

### Accordion (FAQ)
- Filas separadas por un borde índigo al 12%, ícono `+` violeta oscuro que
  rota 45° al abrir, transición de `grid-template-rows` para el alto animado.

### Calculadora de reparto (componente firma)
Sustituye a la prueba social que no existe. El productor escribe cualquier
precio y ve, en tiempo real, cuánto paga el comprador, cuánto cae en su cuenta
(el 100% de lo que publicó, resaltado con borde lima) y la diferencia
explicada en una frase.

### Marco de video del hero
El video no es fondo de página: vive dentro de una tarjeta con borde violeta
al 40% y esquinas de `24px`, con una tarjeta blanca flotante superpuesta que
lleva el dato de 0% comisión. Es el único lugar donde el violeta claro se usa
como borde en vez de superficie.

## Do's and Don'ts

### Do:
- **Do** usar píldora completa en todos los botones y CTAs.
- **Do** reservar el fondo sólido índigo para un único bloque: el cierre.
- **Do** limitar el lima a acciones que llevan a publicar un evento.
- **Do** usar violeta oscuro (`#7c3aed`), nunca el claro (`#c084fc`), para
  cualquier texto.
- **Do** mostrar el 100% del precio publicado cayendo en la cuenta del
  productor en cualquier lugar donde se hable de plata.
- **Do** dejar el contenido visible por defecto y esconderlo solo bajo
  `.motion-on`.
- **Do** respetar `prefers-reduced-motion`.

### Don't:
- **Don't** fabricar logos, testimonios o cifras de ventas.
- **Don't** usar el violeta claro (`#c084fc`) como color de texto: falla
  contraste sobre blanco.
- **Don't** poner más de un bloque de fondo índigo sólido en la misma página.
- **Don't** prometer $0 sin la letra chica del cargo por servicio del 10%.
- **Don't** usar curvas de rebote o elásticas; el movimiento decelera con
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Don't** usar fotografías de banco de imágenes; los espacios de imagen se
  marcan como pendientes hasta tener el asset real del productor.
