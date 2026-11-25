/* Genera los dos proyectos de Hyperframes (9x16 y 16x9) desde src/. Uso: node build.mjs */
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DURATION = 24;
const read = (p) => readFileSync(join(HERE, p), "utf8");
const FORMATS = { "9x16": { W: 1080, H: 1920, cls: "f916" }, "16x9": { W: 1920, H: 1080, cls: "f169" } };

for (const [name, f] of Object.entries(FORMATS)) {
  const dir = join(HERE, name);
  mkdirSync(join(dir, "assets"), { recursive: true });
  cpSync(join(HERE, "shared", "fonts"), join(dir, "assets", "fonts"), { recursive: true });
  copyFileSync(join(HERE, "shared", "gsap.min.js"), join(dir, "assets", "gsap.min.js"));
  copyFileSync(join(HERE, "shared", "anc-mark.png"), join(dir, "assets", "anc-mark.png"));
  copyFileSync(join(HERE, "hyperframes.json"), join(dir, "hyperframes.json"));
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: `anc-${name}`, name: `ANC Tickets ${name}`, createdAt: "2026-01-01T00:00:00.000Z" }));
  const fill = (s) => s.replaceAll("{{W}}", f.W).replaceAll("{{H}}", f.H).replaceAll("{{DURATION}}", DURATION).replaceAll("{{FORMAT}}", f.cls);
  const html = fill(read("src/template.html"))
    .replace("{{PHONECSS}}", () => read("shared/phone.css"))
    .replace("{{VIDEOCSS}}", () => fill(read("src/video.css")))
    .replace("{{BODY}}", () => read("src/body.html"))
    .replace("{{SCRIPT}}", () => fill(read("src/scene.js")));
  writeFileSync(join(dir, "index.html"), html);
  console.log(`${name}: ${f.W}x${f.H}, ${DURATION}s`);
}
