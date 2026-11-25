/* Efectos de interfaz sutiles generados por código (sin pistas ni samples). Salida: out/sfx.wav (mono, 48 kHz). */
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 48000, DUR = 24;
const buf = new Float32Array(SR * DUR);

function add(t, len, fn, gain) {
  const s0 = Math.floor(t * SR), n = Math.floor(len * SR);
  for (let i = 0; i < n && s0 + i < buf.length; i++) buf[s0 + i] += fn(i / SR, i / n) * gain;
}
const env = (p, a = 0.02) => (p < a ? p / a : Math.pow(1 - (p - a) / (1 - a), 2.2));
// notificación: dos notas suaves
const chime = (t) => {
  add(t, 0.5, (x, p) => Math.sin(2 * Math.PI * 1318.5 * x) * env(p, 0.01), 0.07);
  add(t + 0.09, 0.6, (x, p) => Math.sin(2 * Math.PI * 1760 * x) * env(p, 0.01), 0.06);
};
// escaneo: bip corto
const beep = (t) => add(t, 0.16, (x, p) => Math.sin(2 * Math.PI * 1568 * x) * env(p, 0.01), 0.08);
// válida: bip ascendente
const ok = (t) => { add(t, 0.12, (x, p) => Math.sin(2 * Math.PI * 988 * x) * env(p, 0.01), 0.07); add(t + 0.1, 0.25, (x, p) => Math.sin(2 * Math.PI * 1480 * x) * env(p, 0.01), 0.08); };
// whoosh: ruido filtrado
let lp = 0, seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const whoosh = (t, len = 0.5) => add(t, len, (x, p) => { lp += (rnd() - lp) * (0.05 + 0.3 * p); return lp * Math.sin(Math.PI * p); }, 0.35);
// toque: clic suave
const tap = (t) => add(t, 0.06, (x, p) => Math.sin(2 * Math.PI * 520 * x) * env(p, 0.005), 0.08);

whoosh(3.4, 0.9);                       // entra el celular
whoosh(4.15); whoosh(8.45); whoosh(12.85); whoosh(17.25); // cambios de escena
tap(7.7);                               // Publicar
[8.9, 9.9, 10.9, 11.9].forEach(chime); // ventas
beep(14.45); ok(14.6);                  // escáner 1
beep(16.25); ok(16.4);                  // escáner 2
whoosh(20.7, 0.8); whoosh(21.3, 0.6);   // cierre

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const k = peak > 0.5 ? 0.5 / peak : 1;
const pcm = Buffer.alloc(buf.length * 2);
buf.forEach((v, i) => pcm.writeInt16LE(Math.max(-1, Math.min(1, v * k)) * 32767, i * 2));
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
mkdirSync("out", { recursive: true });
writeFileSync("out/sfx.wav", Buffer.concat([h, pcm]));
console.log("out/sfx.wav listo");
