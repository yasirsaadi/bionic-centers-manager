// **طقسُ مدينة الفرع النشط لرأس القائمة** (§4.es).
//
//   GET /api/weather — `{ weather: WeatherNow | null }`
//
// **لكلّ موظّفٍ داخل**، والمدينةُ من فرع جلسته النشط (`branchName` — يتبدّل بتبديل الفرع)، و«كل الفروع» للمسؤول ⟵ بغداد.
// **ولا قاعدةَ ولا كتابة**: اسمُ الفرع في الجلسة، والطقسُ من ذاكرة الخادم (`metno.ts`) — فالطلبُ رخيصٌ ولو أُعيد مع كلّ إشارة.
// **ولا خطأَ يصل الشاشة**: ما لا يُعرف ⟵ `weather: null` فتختفي الشريحةُ وتبقى الساعة.
import type { Express } from "express";
import { getSession } from "../sessions_module/permissions";
import { HEAD_OFFICE_CITY, cityForBranchName, conditionOf, type WeatherNow } from "@shared/weather";
import { cityWeatherNow } from "./metno";

export function registerWeatherRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/weather", isAuthenticated, async (req: any, res) => {
    try {
      const s: any = getSession(req);
      const allBranches = Boolean(s?.isAdmin) && !(Number(s?.branchId) > 0);
      const city = allBranches ? HEAD_OFFICE_CITY : cityForBranchName(s?.branchName);
      if (!city) return res.json({ weather: null });
      const now = await cityWeatherNow(city);
      if (!now) return res.json({ weather: null });
      const c = conditionOf(now.symbol);
      const weather: WeatherNow = {
        cityKey: city.key,
        city: city.name,
        tempC: Math.round(now.temp * 10) / 10,
        kind: c?.kind ?? null,
        night: c?.night ?? false,
        label: c?.label ?? null,
        updatedAt: now.updatedAt,
      };
      res.json({ weather });
    } catch (e) {
      console.error("[weather]", e);
      res.json({ weather: null });
    }
  });
}
