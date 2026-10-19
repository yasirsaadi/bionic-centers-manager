// **طقسُ مدينة الفرع النشط لرأس القائمة** (§4.es).
//
//   GET /api/weather — `{ weather: WeatherNow | null }`
//
// **لكلّ موظّفٍ داخل**، والمدينةُ من فرع جلسته النشط (`branchName` — يتبدّل بتبديل الفرع)، و«كل الفروع» للمسؤول ⟵ بغداد.
// **مصدران يُجمعان** (`combineWeather`): توقّعُ الأرصاد النرويجية لمدينة الفرع (`metno.ts`)، ورصدُ أقرب مطارٍ يرصد (`metar.ts`)
// — والرصدُ يغلب فيما يعرفه: الغبارُ والظواهرُ ضمن ١٠٠ كم، والحرارةُ والغيومُ ضمن ٣٠ كم.
// **ولا قاعدةَ ولا كتابة**: اسمُ الفرع في الجلسة، والمصدران من ذاكرة الخادم — فالطلبُ رخيصٌ ولو أُعيد مع كلّ إشارة.
// **ولا خطأَ يصل الشاشة**: ما لا يُعرف ⟵ `weather: null` فتختفي الشريحةُ وتبقى الساعة.
import type { Express } from "express";
import { getSession } from "../sessions_module/permissions";
import { HEAD_OFFICE_CITY, cityForBranchName, combineWeather, pickObservation } from "@shared/weather";
import { cityWeatherNow } from "./metno";
import { metarObservations } from "./metar";

export function registerWeatherRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/weather", isAuthenticated, async (req: any, res) => {
    try {
      const s: any = getSession(req);
      const allBranches = Boolean(s?.isAdmin) && !(Number(s?.branchId) > 0);
      const city = allBranches ? HEAD_OFFICE_CITY : cityForBranchName(s?.branchName);
      if (!city) return res.json({ weather: null });
      const nowMs = Date.now();
      const [forecast, observations] = await Promise.all([cityWeatherNow(city, nowMs), metarObservations(nowMs)]);
      res.json({ weather: combineWeather(city, forecast, pickObservation(city, observations, nowMs), nowMs) });
    } catch (e) {
      console.error("[weather]", e);
      res.json({ weather: null });
    }
  });
}
