//  **شرائطُ الدفعة الكبيرة** (§4.ga — طلبُ المالك ٢٠٢٦-١١-٠٦، وشكلُها «انفجارٌ من الزرّ» الذي اختاره من المعاينة).
//
//    • الخادمُ وحده يقرّر متى (`X-Big-Payment` على ردٍّ ناجح — `shared/big_payment.ts`)، وغلافُ `fetch` في `main.tsx` يستدعي `launchPaymentConfetti`.
//    • **تخرج من الزرّ الذي ضغطه الموظّف** («تم الدفع» أو «إتمام البيع» …): آخرُ زرٍّ ضُغط قبل الردّ، وإن لم يُعرف أو اختفى فمن أسفل وسط الشاشة.
//    • **لا تستقبل لمسة** (`pointer-events: none`) — كلُّ زرٍّ تحتها يعمل؛ ولمسةٌ واحدة في أيّ مكانٍ توقفها في الحال.
//    • ثلاثُ ثوانٍ ونصف ثمّ تتلاشى وتُزال من الصفحة، ولوحةٌ واحدة، وعددُها على الهاتف نصفُه على الحاسوب، وتزيد بكِبَر المبلغ.
//    • ومَن ضبط جهازَه على «تقليل الحركة» لا تُركَّب له أصلاً، ولا صوت.
import { BIG_PAYMENT_FX_MS, bigPaymentIntensity, type BigPaymentNotice } from "@shared/big_payment";

const COLORS = ["#16a3a3", "#f5b82e", "#ff6b6b", "#8b5cf6", "#38bdf8", "#84cc16", "#f472b6", "#fb923c"];
const FADE = 700;
/** الزرُّ الذي يُحسب مصدراً — ما ضُغط قبل الردّ بهذا القدر أو أقلّ. */
const PRESS_WINDOW_MS = 30_000;

let lastPress: { el: Element; rect: DOMRect; at: number } | null = null;
let installed = false;
let active: { stop: () => void } | null = null;

function reducedMotion(): boolean {
  try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; } catch { return false; }
}

/** يتذكّر آخرَ زرٍّ ضُغط — يُركَّب مرّةً واحدة. */
export function installPressTracker(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const remember = (e: Event) => {
    const t = e.target as Element | null;
    const el = t?.closest?.("button, [role='button'], input[type='submit']");
    if (el) lastPress = { el, rect: el.getBoundingClientRect(), at: Date.now() };
  };
  document.addEventListener("pointerdown", remember, { capture: true, passive: true });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") remember(e); }, { capture: true, passive: true });
}

/** مصدرُ الانفجار: وسطُ الزرّ إن كان ظاهراً الآن، وإلّا حيث كان، وإلّا أسفلُ وسط الشاشة. */
function origin(W: number, H: number): { x: number; y: number } {
  if (lastPress && Date.now() - lastPress.at <= PRESS_WINDOW_MS) {
    const live = lastPress.el.isConnected ? lastPress.el.getBoundingClientRect() : null;
    const r = live && live.width > 0 && live.height > 0 ? live : lastPress.rect;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x >= 0 && x <= W && y >= 0 && y <= H) return { x, y };
  }
  return { x: W / 2, y: H * 0.82 };
}

interface Part { kind: "ribbon" | "paper" | "dot"; x: number; y: number; vx: number; vy: number; color: string;
  rot: number; vr: number; ph: number; vph: number; w: number; h: number; len: number; sway: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function cheerEl(n: BigPaymentNotice): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("dir", "rtl");
  el.style.cssText = [
    "position:fixed", "left:50%", "top:22%", "z-index:2147483001", "pointer-events:none",
    "transform:translate(-50%,0) scale(.9)", "opacity:0", "transition:opacity .35s, transform .35s",
    "background:rgba(255,255,255,.95)", "color:#102225", "border-radius:16px", "padding:12px 22px",
    "box-shadow:0 10px 30px rgba(16,34,37,.18)", "text-align:center", "line-height:1.35",
    "font-family:var(--font-display, 'Almarai', sans-serif)", "font-weight:800", "font-size:22px", "max-width:calc(100vw - 32px)",
  ].join(";");
  const title = document.createElement("div");
  title.textContent = n.name ? `أحسنت يا ${n.name}` : "أحسنت";
  const sub = document.createElement("div");
  sub.style.cssText = "font-family:var(--font-body, 'Tajawal', sans-serif);font-weight:500;font-size:14px;color:#5f7477";
  const num = document.createElement("span");
  num.dir = "ltr";
  num.style.unicodeBidi = "isolate";
  num.textContent = n.amount.toLocaleString("en-US");
  sub.append("دفعةٌ بـ ", num, " دينار");
  el.append(title, sub);
  return el;
}

/** يطلق الشرائط من الزرّ المضغوط — ودفعةٌ ثانيةٌ أثناءها تبدأ من جديد. */
export function launchPaymentConfetti(n: BigPaymentNotice): void {
  if (typeof document === "undefined" || reducedMotion()) return;
  active?.stop();
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const phone = W < 640;
  const k = phone ? 0.85 : 1;
  const count = Math.round((phone ? 60 : 120) * bigPaymentIntensity(n.amount));
  const o = origin(W, H);
  const v = Math.sqrt(H) * 0.62;
  const parts: Part[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const ang = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = v * rnd(0.35, 0.85);
    parts.push({ kind: r < 0.45 ? "ribbon" : r < 0.9 ? "paper" : "dot", x: o.x + rnd(-20, 20), y: o.y,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: rnd(0, 6.28), vr: rnd(-0.18, 0.18), ph: rnd(0, 6.28), vph: rnd(0.08, 0.2),
      w: rnd(6, 10) * k, h: rnd(10, 16) * k, len: rnd(24, 40) * k, sway: rnd(0.4, 1.2) });
  }

  const cheer = cheerEl(n);
  document.body.appendChild(cheer);
  requestAnimationFrame(() => { cheer.style.opacity = "1"; cheer.style.transform = "translate(-50%,0) scale(1)"; });
  const cheerTimer = window.setTimeout(() => { cheer.style.opacity = "0"; }, BIG_PAYMENT_FX_MS - 500);

  let raf = 0;
  const started = performance.now();
  const draw = (p: Part) => {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
    if (p.kind === "paper") {
      const flip = Math.cos(p.ph);
      ctx.scale(1, flip);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else if (p.kind === "dot") {
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.42, 0, 6.283); ctx.fill();
    } else {
      //  شريطٌ ملتفّ: خطٌّ متموّج يتحرّك موجُه فيبدو كأنّه يلتفّ وهو يسقط.
      ctx.lineWidth = Math.max(2.5, p.w * 0.38); ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= 9; i++) {
        const t = i / 9, yy = -p.len / 2 + t * p.len, xx = Math.sin(p.ph + t * 6.2) * p.w * 0.55;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
  const tick = (now: number) => {
    const t = now - started;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = t > BIG_PAYMENT_FX_MS - FADE ? Math.max(0, (BIG_PAYMENT_FX_MS - t) / FADE) : 1;
    const g = 0.18 + H / 9000;
    for (const p of parts) {
      p.vy += g * (p.kind === "ribbon" ? 0.55 : 0.7);
      p.vx *= 0.985; p.vy *= p.vy > 0 ? 0.965 : 0.985;
      p.ph += p.vph; p.rot += p.vr;
      p.x += p.vx + Math.sin(p.ph) * p.sway; p.y += p.vy;
      if (p.y < H + 60) draw(p);
    }
    if (t < BIG_PAYMENT_FX_MS) raf = requestAnimationFrame(tick); else stop();
  };

  //  لمسةٌ واحدة في أيّ مكانٍ توقفها — بعد لحظةٍ من البدء، فلا تُطفئها الضغطةُ التي أطلقتها.
  const onPress = () => { if (performance.now() - started > 250) stop(); };
  const onHide = () => { if (document.hidden) stop(); };
  function stop() {
    cancelAnimationFrame(raf);
    window.clearTimeout(cheerTimer);
    window.removeEventListener("pointerdown", onPress, true);
    document.removeEventListener("visibilitychange", onHide);
    canvas.remove(); cheer.remove();
    if (active === handle) active = null;
  }
  const handle = { stop };
  active = handle;
  window.addEventListener("pointerdown", onPress, { capture: true, passive: true });
  document.addEventListener("visibilitychange", onHide);
  raf = requestAnimationFrame(tick);
}
