# Video promocional de ANC Tickets (Hyperframes)

Proyecto aparte de la app Next: Hyperframes NO es dependencia de la app. Dos composiciones HTML de 20,5 s (parten directo en "Crea tu evento", sin apertura de logo) que reutilizan el celular de la portada:

- `9x16/` (1080x1920) y `16x9/` (1920x1080). Se generan con `node build.mjs` desde `src/` (plantilla, estilos, línea de tiempo GSAP) y `shared/` (copia del CSS del celular, fuentes, gsap, logo).
- Datos del celular: evento ficticio "Noche Neón", marcado como "Ejemplo".

## Requisitos
Node 22+, ffmpeg y Chrome (`/usr/bin/google-chrome` o `PUPPETEER_EXECUTABLE_PATH`).

## Comandos
```bash
cd video
export HYPERFRAMES_NO_TELEMETRY=1
npm install
node build.mjs                      # regenera 9x16/ y 16x9/
npx hyperframes lint 9x16
npx hyperframes render 9x16 -o out/anc-9x16-silent.mp4 --quiet
npx hyperframes render 16x9 -o out/anc-16x9-silent.mp4 --quiet

# Redes: efectos sutiles generados por código (sin música ni samples)
node sfx.mjs
ffmpeg -y -i out/anc-9x16-silent.mp4 -i out/sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest out/anc-9x16.mp4
ffmpeg -y -i out/anc-16x9-silent.mp4 -i out/sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest out/anc-16x9.mp4

# Web 1080p (< 3 MB, H.264, sin audio, faststart) y posters
ffmpeg -y -i out/anc-9x16-silent.mp4 -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart ../public/video/anc-9x16.mp4
ffmpeg -y -i out/anc-16x9-silent.mp4 -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart ../public/video/anc-16x9.mp4
ffmpeg -y -ss 6.3 -i out/anc-9x16-silent.mp4 -frames:v 1 -c:v libwebp -quality 78 ../public/video/anc-9x16.webp
ffmpeg -y -ss 6.3 -i out/anc-16x9-silent.mp4 -frames:v 1 -c:v libwebp -quality 78 ../public/video/anc-16x9.webp
```
`out/` está en `.gitignore`: las versiones de redes no se commitean. Cada render tarda unos 2,5 minutos (captura por pantallazos, sin GPU).

Para revisar cuadros sin renderizar: `npx hyperframes snapshot 9x16 --at 2,6,9.5,14.8,19.5,22.8`.

Si cambias el celular en `src/app/brand.css`, regenera `shared/phone.css` (copia de la sección "PORTADA", sin transiciones) y corre `node build.mjs`.
