// **طقسُ مدينة الفرع النشط لرأس القائمة** (§4.es).
//
//   GET /api/weather — `{ weather: WeatherNow | null }`
//
// **لكلّ موظّفٍ داخل**، والمدينةُ من فرع جلسته النشط (`branchName` — يتبدّل بتبديل الفرع)، و«كل الفروع» للمسؤول ⟵ بغداد.
// **مصدران يُجمعان** (`combineWeather`): توقّعُ الأرصاد النرويجية لمدينة الفرع (`metno.ts`)، ورصدُ أقرب مطارٍ يرصد (`metar.ts`)
// — والرصدُ يغلب فيما يعرفه: الغبارُ والظواهرُ ضمن ١٠٠ كم، والحرارةُ والغيومُ ضمن ٣٠ كم.
// **ولا قاعدةَ ولا كتابة**: اسمُ الفرع في الجلسة، والمصدران من ذاكرة الخادم — فالطلبُ رخيصٌ ولو أُعيد مع كلّ إشارة.
// **ومكانُ الجهاز يغلب الفرع** (§4.gl): `?lat=&lon=` بخانةٍ عشرية ⟵ أقربُ مدينةٍ معروفة ضمن ٤٠ كم، أو مكانٌ جديد باسمه من الخريطة؛
// وبلاهما (رفض الإذن، أو جهازٌ بلا موقع، أو بلغ حدُّ الأماكن الجديدة) ⟵ مدينةُ الفرع كما كانت.
// **ولا خطأَ يصل الشاشة**: ما لا يُعرف ⟵ `weather: null` فتختفي الشريحةُ وتبقى الساعة.
import type { Express } from "express";
import { getSession } from "../sessions_module/permissions";
import {
  DEVICE_PLACE_FALLBACK, HEAD_OFFICE_CITY, cityForBranchName, combineWeather, deviceWeatherPlace, parseDeviceCoords, pickObservation,
  type WeatherCity,
} from "@shared/weather";
import { cityWeatherNow } from "./metno";
import { metarObservations } from "./metar";
import { admitPlace, placeName } from "./geocode";

export const GEO_NAME_DEADLINE_MS = 3000;

export function registerWeatherRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/weather", isAuthenticated, async (req: any, res) => {
    try {
      const s: any = getSession(req);
      const nowMs = Date.now();
      let city: WeatherCity | null = null;
      let fromDevice = false;
      const dev = parseDeviceCoords(req.query?.lat, req.query?.lon);
      if (dev) {
        const place = deviceWeatherPlace(dev.lat, dev.lon);
        if (place.known) {
          city = place.city;
          fromDevice = true;
        } else if (admitPlace(place.city.key, nowMs)) {
          //  لا ينتظر الطلبُ الخريطةَ أكثرَ من ثلاث ثوانٍ: بعدها «موقعك»، والجلبُ يكمل فيأخذ الطلبُ التالي الاسم.
          const nm = await Promise.race([
            placeName(place.city.key, place.city.lat, place.city.lon, nowMs),
            new Promise<null>((r) => setTimeout(() => r(null), GEO_NAME_DEADLINE_MS).unref()),
          ]);
          city = { ...place.city, name: nm?.ar ?? DEVICE_PLACE_FALLBACK.ar, nameEn: nm?.en ?? DEVICE_PLACE_FALLBACK.en };
          fromDevice = true;
        }
      }
      if (!city) {
        const allBranches = Boolean(s?.isAdmin) && !(Number(s?.branchId) > 0);
        city = allBranches ? HEAD_OFFICE_CITY : cityForBranchName(s?.branchName);
      }
      if (!city) return res.json({ weather: null });
      const [forecast, observations] = await Promise.all([cityWeatherNow(city, nowMs), metarObservations(nowMs)]);
      const w = combineWeather(city, forecast, pickObservation(city, observations, nowMs), nowMs);
      res.json({ weather: w ? { ...w, fromDevice } : null });
    } catch (e) {
      console.error("[weather]", e);
      res.json({ weather: null });
    }
  });
}
