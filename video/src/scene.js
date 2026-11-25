const WIDE = document.body.classList.contains("f169");
const DUR = {{DURATION}};
const tl = gsap.timeline({ paused: true });
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clp = (n) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ---- QR de adorno (determinista)
(() => {
  const q = $("#qr"); const n = 11;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
    const s = document.createElement("span");
    if (f || ((x * 7 + y * 13 + x * y) % 5) % 2 === 0) s.className = "on";
    q.appendChild(s);
  }
  [18, 26, 22, 34, 41, 38, 52, 64, 58, 72, 88, 100].forEach((h) => {
    const b = document.createElement("span"); b.style.height = h + "%"; $("#bars").appendChild(b);
  });
})();

// ---- ventas de ejemplo (mismas que la portada)
const SALES = [
  { n: 2, tier: "General", amount: 24000, at: 8.9 },
  { n: 1, tier: "VIP", amount: 25000, at: 9.9 },
  { n: 3, tier: "General", amount: 36000, at: 10.9 },
  { n: 2, tier: "VIP", amount: 50000, at: 11.9 },
];
SALES.forEach((s, i) => {
  const li = document.createElement("li");
  li.className = "lv-toast"; li.id = "t" + i;
  li.innerHTML = `<span class="lv-dot">+</span><span class="lv-toast-body"><span class="lv-toast-line">+${s.n} ${s.n === 1 ? "entrada" : "entradas"} · ${s.tier} · ${clp(s.amount)}</span><span class="lv-toast-sub">Pagado con Mercado Pago · ahora</span></span>`;
  $("#feed").appendChild(li);
});

// ---- estados iniciales
gsap.set(".layer", { opacity: 0 });
gsap.set(["#intro", "#brand", ".cap", "#outro"], { opacity: 1 });
gsap.set(".cap", { autoAlpha: 0 });
gsap.set("#brand", { opacity: 0 });
gsap.set(".ln > span", { yPercent: 115 });
gsap.set("#i-logo", { scale: 0.4, opacity: 0 });
gsap.set("#i-tag", { opacity: 0, y: 20 });
gsap.set("#outro", { autoAlpha: 0 });
gsap.set("#stage", { autoAlpha: 0 });
gsap.set("#spin", { rotationY: -38, rotationX: 10, y: WIDE ? 700 : 1100 });
gsap.set([".wf", ".ws"], { opacity: 0, y: 14 });
gsap.set(".wz-type", { clipPath: "inset(0 100% 0 0)" });
gsap.set(".wz-tick", { opacity: 0, scale: 0.4 });
gsap.set("#wz-prog", { scaleX: 0.05, transformOrigin: "left" });
gsap.set("#wz-prev", { opacity: 0, y: 14 });
gsap.set("#wz-cta", { opacity: 0 });
gsap.set("#wz-live", { opacity: 0, y: 16 });
gsap.set([".lv-toast"], { opacity: 0, x: 80 });
gsap.set("#bars span", { scaleY: 0.05, transformOrigin: "bottom" });
gsap.set("#sc-ok", { opacity: 0, y: 24 });
const PX = parseFloat(getComputedStyle($(".ph")).width) * 0.944 / 100; // 1cqw en px
gsap.set("#sc-line", { y: 0 });
gsap.set(".ar", { opacity: 0, x: 40 });
gsap.set(".am-bar span", { scaleX: 0, transformOrigin: "left" });
gsap.set(["#am-code", "#am-pay"], { opacity: 0, x: 40 });
gsap.set("#o-pill", { scale: 0.8, opacity: 0 });
gsap.set("#o-sub", { opacity: 0 });
gsap.set("#o-logo", { opacity: 0, scale: 0.5 });

const ease = "power3.out";
const lines = (sel, t, d = 0.7) => tl.to(`${sel} .ln > span`, { yPercent: 0, duration: d, ease: "power4.out", stagger: 0.12 }, t);
const linesOut = (sel, t) => tl.to(`${sel} .ln > span`, { yPercent: -115, duration: 0.45, ease: "power3.in", stagger: 0.06 }, t);

// fondo vivo
tl.to("#glow-a", { x: 220, y: 160, duration: DUR, ease: "none" }, 0);
tl.to("#glow-b", { x: -200, y: -120, duration: DUR, ease: "none" }, 0);

// ================= 0–4: apertura =================
tl.to("#i-logo", { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, 0.15);
tl.to("#i-tag", { opacity: 1, y: 0, duration: 0.5, ease }, 0.5);
lines("#intro", 0.8, 0.75);
// salida de la apertura
linesOut("#intro", 3.3);
tl.to(["#i-logo", "#i-tag"], { opacity: 0, y: -30, duration: 0.4 }, 3.3);
tl.set("#intro", { autoAlpha: 0 }, 3.95);

// ================= celular entra =================
tl.set("#stage", { autoAlpha: 1 }, 3.5);
tl.to("#spin", { y: 0, rotationY: -14, rotationX: 5, duration: 1.3, ease: "power3.out" }, 3.5);
tl.to("#brand", { opacity: 1, duration: 0.5 }, 4.3);

const show = (id, a, b) => { tl.to(id, { opacity: 1, duration: 0.35 }, a); if (b) tl.to(id, { opacity: 0, duration: 0.3 }, b); };
const cap = (id, a, b) => {
  tl.set(id, { autoAlpha: 1 }, a);
  lines(id, a + 0.05, 0.6);
  tl.from(`${id} .mono, ${id} p`, { opacity: 0, y: 16, duration: 0.5, ease }, a + 0.2);
  linesOut(id, b - 0.45);
  tl.to(`${id} .mono, ${id} p`, { opacity: 0, duration: 0.3 }, b - 0.4);
  tl.set(id, { autoAlpha: 0 }, b);
};

// ================= 4.2–8.5: crear =================
cap("#cap1", 4.2, 8.5); show("#L1", 4.2, 8.6);
tl.to("#spin", { rotationY: 10, rotationX: 3, duration: 3.8, ease: "sine.inOut" }, 4.85);
tl.to(".ws", { opacity: 1, y: 0, duration: 0.4, stagger: 1.2, ease }, 4.7);
[0, 1, 2].forEach((i) => {
  const t = 4.9 + i * 1.05;
  tl.to($$(".wf")[i], { opacity: 1, y: 0, duration: 0.35, ease }, t);
  tl.to($$(".wz-type")[i], { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "steps(14)" }, t + 0.25);
  tl.to($$(".wz-tick")[i], { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, t + 0.95);
});
tl.to("#wz-prog", { scaleX: 1, duration: 3.1, ease: "none" }, 4.8);
tl.to("#wz-prev", { opacity: 1, y: 0, duration: 0.45, ease }, 7.3);
tl.to("#wz-cta", { opacity: 1, duration: 0.2 }, 7.3);
tl.to("#wz-cta", { scale: 0.95, duration: 0.15, yoyo: true, repeat: 1 }, 7.7);
tl.to("#wz-cta", { opacity: 0, duration: 0.2 }, 8.0);
tl.to("#wz-live", { opacity: 1, y: 0, duration: 0.4, ease }, 8.0);

// ================= 8.5–12.9: ventas en vivo =================
cap("#cap2", 8.6, 13.0); show("#L2", 8.6, 13.1);
tl.to("#spin", { rotationY: -14, rotationX: 5, duration: 4.2, ease: "sine.inOut" }, 8.85);
tl.to("#bars span", { scaleY: 1, duration: 0.6, stagger: 0.05, ease }, 8.9);
const tot = { rev: 2980000, sold: 248 };
const render = () => { $("#money").textContent = clp(tot.rev); $("#sold").textContent = Math.round(tot.sold); $("#meter").style.width = (tot.sold / 400 * 100) + "%"; };
let acc = { rev: 2980000, sold: 248 };
SALES.forEach((s, i) => {
  tl.to("#t" + i, { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" }, s.at);
  acc = { rev: acc.rev + s.amount, sold: acc.sold + s.n };
  tl.to(tot, { rev: acc.rev, sold: acc.sold, duration: 0.8, ease: "power2.out", onUpdate: render }, s.at + 0.1);
});

// ================= 12.9–17.3: escáner =================
cap("#cap3", 13.0, 17.4); show("#L3", 13.0, 17.5);
tl.to("#spin", { rotationY: 12, rotationX: 4, duration: 4.4, ease: "sine.inOut" }, 13.0);
const scan = (t0, tOk, num, ent) => {
  tl.set("#sc-ok", { opacity: 0, y: 24 }, t0);
  tl.set("#sc-hint", { opacity: 1 }, t0);
  tl.set("#sc-view", { borderColor: "rgba(255,255,255,.1)", boxShadow: "0 0 0 0 rgba(52,211,153,0)" }, t0);
  tl.set(".sc-corner", { borderColor: "#fff" }, t0);
  tl.set("#sc-line", { opacity: 1 }, t0);
  tl.fromTo("#sc-line", { y: 0 }, { y: 50 * PX, duration: tOk - t0, ease: "sine.inOut" }, t0);
  tl.set("#sc-line", { opacity: 0 }, tOk);
  tl.to("#sc-view", { borderColor: "#34d399", boxShadow: "0 0 0 1cqw rgba(52,211,153,.25)", duration: 0.2 }, tOk);
  tl.to(".sc-corner", { borderColor: "#34d399", duration: 0.2 }, tOk);
  tl.to("#sc-hint", { opacity: 0, duration: 0.15 }, tOk);
  tl.call(() => { $("#ok-small").textContent = "General · Entrada #0" + ent; }, null, tOk);
  tl.to("#sc-ok", { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" }, tOk);
  const o = { v: num - 1 };
  tl.to(o, { v: num, duration: 0.25, snap: { v: 1 }, onUpdate: () => { $("#in-n").textContent = o.v; } }, tOk + 0.05);
  tl.fromTo(".sc-num", { scale: 1.3, color: "#34d399" }, { scale: 1, color: "#ffffff", duration: 0.5, ease: "power2.out", immediateRender: false }, tOk + 0.05);
};
scan(13.4, 14.6, 188, 188);
scan(15.5, 16.4, 189, 189);

// ================= 17.3–20.7: embajadores =================
cap("#cap4", 17.4, 20.8); show("#L4", 17.4, 20.9);
tl.to("#spin", { rotationY: -14, rotationX: 5, duration: 3.2, ease: "sine.inOut" }, 17.4);
tl.to(".ar", { opacity: 1, x: 0, duration: 0.5, stagger: 0.22, ease }, 17.8);
tl.to(".am-bar span", { scaleX: 1, duration: 0.9, stagger: 0.22, ease }, 18.1);
tl.to("#am-code", { opacity: 1, x: 0, duration: 0.5, ease }, 19.1);
tl.to("#am-pay", { opacity: 1, x: 0, duration: 0.5, ease }, 19.8);

// ================= 20.8–24: cierre =================
tl.to("#spin", { y: WIDE ? 900 : 1500, rotationY: -40, rotationX: 12, duration: 0.8, ease: "power3.in" }, 20.7);
tl.set("#stage", { autoAlpha: 0 }, 21.55);
tl.to("#brand", { opacity: 0, duration: 0.3 }, 20.8);
tl.set("#outro", { autoAlpha: 1 }, 21.2);
tl.to("#o-logo", { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, 21.3);
lines("#outro", 21.5, 0.7);
tl.to("#o-pill", { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }, 22.3);
tl.to("#o-sub", { opacity: 1, duration: 0.5 }, 22.6);
tl.to({}, { duration: 0.01 }, DUR - 0.01);

window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
