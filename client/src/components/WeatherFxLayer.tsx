//  **طبقةُ مؤثّر الطقس** (§4.fw) — قطراتُ مطرٍ أو ذرّاتُ غبارٍ فوق الشاشة كلِّها، بالرسم الذي وافق عليه المالكُ في المعاينة.
//
//    • **لا تستقبل لمسة** (`pointer-events: none`): كلُّ زرٍّ تحتها يعمل — و«حسناً» في التحيّة أوّلُها.
//    • **سبعُ ثوانٍ** ثمّ تتلاشى وتُزال من الصفحة (`onDone`)؛ **ولمسةٌ واحدة في أيّ مكانٍ توقفها** (تتلاشى في ٤٠٠ ملّي ثانية).
//    • **خفيفة**: لوحةُ رسمٍ واحدة، وعددُ الذرّات على الهاتف نصفُه على الحاسوب، وتتوقّف في الحال إن ترك الموظّفُ الصفحة.
//    • ومَن ضبط جهازَه على «تقليل الحركة» لا تُركَّب له أصلاً — القرارُ عند من يستدعيها (`prefersReducedMotion`).
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WEATHER_FX_DURATION_MS, type WeatherFx } from "@shared/weather_greeting_fx";

export function prefersReducedMotion(): boolean {
  try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; } catch { return false; }
}

interface RainCfg { n: number; len: [number, number]; sp: [number, number]; a: number; w: number; splash: number; tint: number; flash?: boolean }
const RAIN: Partial<Record<WeatherFx, RainCfg>> = {
  drizzle: { n: 70, len: [6, 11], sp: [5, 7], a: .36, w: .6, splash: .15, tint: 0 },
  rain: { n: 130, len: [14, 24], sp: [11, 16], a: .5, w: 1.6, splash: .5, tint: .05 },
  heavy: { n: 230, len: [20, 32], sp: [16, 23], a: .58, w: 2.4, splash: .8, tint: .10 },
  thunder: { n: 210, len: [20, 32], sp: [16, 23], a: .58, w: 2.8, splash: .8, tint: .12, flash: true },
};
const FADE_IN = 600, FADE_OUT = 1500, STOP_FADE = 400;
/** ومضاتُ البرق — بالملّي ثانية من البداية. */
const FLASHES = [1500, 1650, 4700];

interface Drop { x: number; y: number; z: number; len: number; sp: number; floor: number }
interface Mote { x: number; y: number; r: number; vx: number; ph: number; a: number }
interface Splash { x: number; y: number; age: number; z: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function WeatherFxLayer({ fx, onDone }: { fx: WeatherFx; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { doneRef.current(); return; }
    let W = 0, H = 0;
    //  **المقاسُ من اللوحة نفسِها** (مراجعة): `100vh` في متصفّح الهاتف أطولُ من المرئيّ حين يظهر شريطُه، فلوحةٌ بارتفاع النافذة كانت تُمطّ.
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const phone = W < 640;
    const cfg = RAIN[fx];
    const storm = fx === "storm";
    const newDrop = (c: RainCfg, anywhere: boolean): Drop => {
      const z = Math.random();             // العمق: البعيدُ أرقّ وأبطأ
      return { x: rnd(-60, W + 20), y: anywhere ? rnd(-H, H) : rnd(-80, -10), z,
        len: rnd(c.len[0], c.len[1]) * (.55 + .45 * z), sp: rnd(c.sp[0], c.sp[1]) * (.6 + .4 * z), floor: H - rnd(0, H * .18) };
    };
    const newMote = (anywhere: boolean): Mote => ({ x: anywhere ? rnd(0, W) : rnd(W, W + 40), y: rnd(0, H), r: rnd(.6, storm ? 2.8 : 2.1),
      vx: -rnd(storm ? 2.4 : 1, storm ? 5 : 2.4), ph: rnd(0, 6.28), a: rnd(.25, .7) });
    const count = Math.round((cfg ? cfg.n : storm ? 260 : 140) * (phone ? .5 : 1));
    const drops: Drop[] = cfg ? Array.from({ length: count }, () => newDrop(cfg, true)) : [];
    const motes: Mote[] = cfg ? [] : Array.from({ length: count }, () => newMote(true));
    const splashes: Splash[] = [];
    //  **الساعةُ تبدأ مع أوّل إطارٍ يُرسَم لا مع التركيب** (مراجعة): صفحةٌ مخفيّة لا ترسم، فساعةٌ بدأت قبلها تنتهي قبل أن يُرى شيء.
    let t0: number | null = null;
    let last = 0;
    let stopAt: number | null = null;
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
      doneRef.current();
    };

    //  **الحركةُ بالزمن لا بعدد الإطارات** (مراجعة): شاشةُ ١٢٠ هرتز كانت تُسقط المطرَ بضعف سرعة المعاينة، والهاتفُ البطيء بنصفها.
    //  `k` = الزمنُ منذ الإطار السابق بوحدة إطارٍ من ٦٠ في الثانية (وسقفُه ٣ — بعد توقّفٍ لا تقفز القطراتُ الشاشةَ كلَّها).
    const drawRain = (c: RainCfg, A: number, t: number, k: number) => {
      if (c.tint) { ctx.fillStyle = `rgba(30, 58, 90, ${c.tint * A})`; ctx.fillRect(0, 0, W, H); }
      ctx.lineCap = "round";
      for (const d of drops) {
        d.y += d.sp * k; d.x += c.w * (.5 + .5 * d.z) * k;
        if (d.y > d.floor) {
          if (Math.random() < c.splash * d.z) splashes.push({ x: d.x, y: d.floor, age: 0, z: d.z });
          Object.assign(d, newDrop(c, false));
        }
        const alpha = c.a * (.35 + .65 * d.z) * A;
        const dx = c.w * (d.len / d.sp);
        const g = ctx.createLinearGradient(d.x - dx, d.y - d.len, d.x, d.y);
        g.addColorStop(0, "rgba(120, 170, 215, 0)");
        g.addColorStop(1, `rgba(110, 160, 210, ${alpha})`);
        ctx.strokeStyle = g; ctx.lineWidth = .8 + 1.2 * d.z;
        ctx.beginPath(); ctx.moveTo(d.x - dx, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.age += k;
        const g = s.age / 22;
        if (g >= 1) { splashes.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(110, 160, 210, ${.45 * (1 - g) * A * (.4 + .6 * s.z)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 2 + 12 * g * (.5 + s.z), (2 + 12 * g) * .28, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (c.flash) for (const f of FLASHES) {
        const dt = t - f;
        if (dt > 0 && dt < 260) {
          ctx.fillStyle = `rgba(235, 242, 255, ${(dt < 60 ? dt / 60 : 1 - (dt - 60) / 200) * .55 * A})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    };

    const drawDust = (A: number, t: number, k: number) => {
      const haze = (storm ? .30 : .16) * A;
      const shift = (t / 40) % (W * 2);
      const g = ctx.createLinearGradient(W - shift, 0, W * 2 - shift, H);
      g.addColorStop(0, `rgba(196, 150, 90, ${haze * .6})`);
      g.addColorStop(.5, `rgba(186, 136, 78, ${haze})`);
      g.addColorStop(1, `rgba(196, 150, 90, ${haze * .6})`);
      ctx.fillStyle = `rgba(196, 150, 90, ${haze * .55})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < (storm ? 3 : 2); k++) {
        const cx = ((W * (1.3 - k * .45)) - (t / (storm ? 8 : 14)) * (1 + k * .3)) % (W * 1.6) + W * .3;
        const cy = H * (.25 + k * .3);
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * .45);
        rg.addColorStop(0, `rgba(176, 124, 66, ${haze * .9})`);
        rg.addColorStop(1, "rgba(176, 124, 66, 0)");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      for (const p of motes) {
        p.x += p.vx * k; p.ph += .04 * k; p.y += Math.sin(p.ph) * .5 * k;
        if (p.x < -10) Object.assign(p, newMote(false));
        ctx.fillStyle = `rgba(150, 105, 55, ${p.a * A})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const frame = (now: number) => {
      if (finished) return;
      if (t0 === null) { t0 = now; last = now; }
      const k = Math.min(3, Math.max(0, (now - last) / (1000 / 60)));
      last = now;
      const t = now - t0;
      let A = Math.min(1, t / FADE_IN) * (1 - Math.min(1, Math.max(0, (t - (WEATHER_FX_DURATION_MS - FADE_OUT)) / FADE_OUT)));
      if (stopAt != null) A *= Math.max(0, 1 - (now - stopAt) / STOP_FADE);
      if (t >= WEATHER_FX_DURATION_MS || (stopAt != null && now - stopAt >= STOP_FADE)) { finish(); return; }
      ctx.clearRect(0, 0, W, H);
      if (cfg) drawRain(cfg, A, t, k); else drawDust(A, t, k);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    //  لمسةٌ في أيّ مكانٍ توقفها — في مرحلة الالتقاط، فالنافذةُ التي تمنع اللمسَ خارجها لا تحجبها؛ واللمسةُ نفسُها تصل زرَّها كالمعتاد.
    const tap = () => { if (stopAt == null) stopAt = performance.now(); };
    const hidden = () => { if (document.visibilityState !== "visible") finish(); };
    window.addEventListener("pointerdown", tap, { capture: true, passive: true });
    window.addEventListener("keydown", tap, { capture: true });
    document.addEventListener("visibilitychange", hidden);
    //  تدويرُ الجهاز: مقاسٌ جديد وذرّاتٌ مبعثرةٌ فيه من جديد — لا أرضيّةَ قديمةً في منتصف الشاشة.
    const onResize = () => {
      size();
      if (cfg) drops.forEach((d) => Object.assign(d, newDrop(cfg, true)));
      else motes.forEach((m) => Object.assign(m, newMote(true)));
      splashes.length = 0;
    };
    window.addEventListener("resize", onResize);
    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", tap, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", tap, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", onResize);
    };
  }, [fx]);

  //  فوق النافذة (z-50) — وفي `body` كي لا يقصّها أبٌ له `overflow`.
  return createPortal(
    <canvas ref={ref} aria-hidden data-testid="weather-fx" data-fx={fx}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 70 }} />,
    document.body,
  );
}
