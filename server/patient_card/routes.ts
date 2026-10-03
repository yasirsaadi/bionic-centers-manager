// بطاقةُ المريض في تلغرام (§4.bv) — **نقطةٌ عامّة بلا جلسة موظّف**: الهويّةُ من توقيع تلغرام وحده.
import type { Express } from "express";
import { patientBotConfig } from "../patient_telegram/config";
import { verifyInitData } from "./init_data";
import { buildPatientCard, cardPatientIdsForTelegram } from "./store";

export const PATIENT_CARD_PATH = "/api/patient-card/me";

export function registerPatientCardRoutes(app: Express) {
  app.post(PATIENT_CARD_PATH, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    const config = patientBotConfig();
    if (!config) return res.status(503).json({ error: "unavailable" });
    const v = verifyInitData(req.body?.initData, config.token);
    if (!v.ok) return res.status(401).json({ error: v.reason });
    try {
      const ids = await cardPatientIdsForTelegram(v.telegramUserId);
      const cards = [];
      for (const id of ids) {
        const c = await buildPatientCard(id);
        if (c) cards.push(c);
      }
      return res.json({ cards });
    } catch {
      //  ولا يُطبع الخطأ: قد يحمل initData.
      console.error("[patient-card] build failed");
      return res.status(500).json({ error: "failed" });
    }
  });
}
