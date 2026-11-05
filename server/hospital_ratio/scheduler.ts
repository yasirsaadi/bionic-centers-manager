// **متى يُطابَق عزلُ نسبة مستشفى العين** (§4.fz) — بلا زرّ:
//   • بعد كلّ كتابةٍ ناجحة، مجمَّعةً (ثانيتان بعد آخر كتابة) — فالدفعةُ والاسترجاعُ والتصحيحُ تُرى في الورقة خلال ثوانٍ.
//   • كلَّ ليلة بعد منتصف الليل بتوقيت بغداد، وعند الإقلاع — احتياطاً لما لا يمرّ بطلبٍ (مؤقّتٌ في الخادم، أو نسخةٌ أخرى).
//   • وعند فتح الدفتر نفسِه (`server/cash_book/routes.ts`) — فالورقةُ تقرأ ما يجب أن يكون.
// وما تغيّر يُرسل إشارةَ «تغيّر شيء» للشاشات المفتوحة (§4.cy).
import cron from "node-cron";
import { notifyChange, onSuccessfulWrite } from "../live/updates";
import { reconcileAll } from "./store";

const DEBOUNCE_MS = 2_000;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

async function run(why: string) {
  try {
    const n = await reconcileAll();
    if (n > 0) {
      console.log(`[hospital-ratio] ${why}: ${n} row(s) updated`);
      notifyChange(null);
    }
  } catch (e) {
    console.error("[hospital-ratio] run failed:", e);
  }
}

export function startHospitalRatioReconcile() {
  if (started) return;
  started = true;
  onSuccessfulWrite(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void run("after write"); }, DEBOUNCE_MS);
  });
  //  00:05 بغداد = 21:05 UTC — كلُّ جدولةٍ في المستودع بـ UTC.
  cron.schedule("5 21 * * *", () => { void run("nightly"); }, { timezone: "UTC" });
  setTimeout(() => { void run("startup"); }, 20_000);
}
