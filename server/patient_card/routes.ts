// بطاقةُ المريض في تلغرام (§4.bv).
//  • `POST /api/patient-card/me` — **عامّةٌ بلا جلسة موظّف**: الهويّةُ من توقيع تلغرام وحده.
//  • `GET  /api/patients/:patientId/patient-card` — «معاينة ما يراه المريض»: حارسُ قسم التواصل نفسُه (`resolvePatient`).
//  • `POST /api/patients/:patientId/patient-card` — مفتاحُ «بطاقة المريض مفعّلة»: **للمسؤول وحده** (التجربةُ بمرضى يختارهم المالك)،
//    وسطرُ تدقيقٍ لكلّ تغيير، وعند التفعيل رسالةُ «بطاقتك جاهزة» بزرّها لحساب تلغرام المربوط.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { patientBotConfig } from "../patient_telegram/config";
import { sendMessage } from "../patient_telegram/client";
import { MESSAGES, cardButtonMarkup } from "../patient_telegram/webhook";
import { resolvePatient } from "../patient_contacts/routes";
import { listActiveContacts } from "../patient_contacts/store";
import { verifyInitData } from "./init_data";
import { buildPatientCard, cardPatientIdsForTelegram } from "./store";

export const PATIENT_CARD_PATH = "/api/patient-card/me";

async function cardState(patientId: number) {
  const r = await db.execute(sql`
    SELECT patient_card_enabled AS enabled, patient_card_enabled_at AS enabled_at
      FROM patients WHERE id = ${patientId}`);
  const row: any = r.rows?.[0] ?? {};
  return { enabled: row.enabled === true, enabledAt: row.enabled_at ?? null };
}

export function registerPatientCardRoutes(app: Express, isAuthenticated: any) {
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

  //  ══ معاينةُ الموظّف — البطاقةُ نفسُها التي يراها المريض، **مفعّلةً كانت أو لا** ══
  app.get("/api/patients/:patientId/patient-card", isAuthenticated, async (req: any, res) => {
    try {
      const patient = await resolvePatient(req, res);
      if (!patient) return;
      const [state, contacts, card] = await Promise.all([
        cardState(patient.id),
        listActiveContacts(patient.id),
        buildPatientCard(patient.id),
      ]);
      return res.json({
        ...state,
        telegramLinked: contacts.some((c) => c.channel === "telegram"),
        card,
      });
    } catch {
      console.error("[patient-card] preview failed");
      return res.status(500).json({ message: "تعذّر بناء معاينة البطاقة" });
    }
  });

  //  ══ المفتاح — للمسؤول وحده ══
  app.post("/api/patients/:patientId/patient-card", isAuthenticated, async (req: any, res) => {
    try {
      const s = (req.session as any)?.branchSession;
      if (!s?.isAdmin) return res.status(403).json({ message: "تفعيل البطاقة للمسؤول وحده" });
      const patient = await resolvePatient(req, res);
      if (!patient) return;
      const body = req.body ?? {};
      if (Object.keys(body).some((k) => k !== "enabled") || typeof body.enabled !== "boolean") {
        return res.status(400).json({ message: "المطلوب: enabled صحيح أو خطأ" });
      }
      const enabled: boolean = body.enabled;
      const before = await cardState(patient.id);
      if (before.enabled === enabled) return res.json({ ...before, changed: false, notified: 0 });

      const userId = typeof s.userId === "number" ? s.userId : null;
      await db.execute(sql`
        UPDATE patients
           SET patient_card_enabled = ${enabled},
               patient_card_enabled_at = ${enabled ? sql`now()` : sql`NULL`},
               patient_card_enabled_by = ${enabled ? userId : null}
         WHERE id = ${patient.id}`);
      await logAudit({
        entityType: "patient",
        entityId: patient.id,
        action: enabled ? "patient_card_enabled" : "patient_card_disabled",
        userId,
        userName: s.displayName ?? null,
        branchId: patient.branchId,
        oldValues: { patientCardEnabled: before.enabled },
        newValues: { patientCardEnabled: enabled },
        ipAddress: req.ip ?? null,
        userAgent: req.get?.("user-agent") ?? null,
      });

      //  **عند التفعيل وحده** رسالةٌ بزرّ البطاقة لكلّ حساب تلغرامٍ مربوطٍ ربطاً نشِطاً — «أطلق وأبلغ»، فشلُها لا يُفشل التفعيل.
      let notified = 0;
      if (enabled) {
        const markup = cardButtonMarkup();
        if (markup) {
          const tg = (await listActiveContacts(patient.id)).filter((c) => c.channel === "telegram");
          for (const c of tg) {
            const r = await sendMessage(String(c.externalId), MESSAGES.cardReady, markup);
            if (r.ok) notified++;
          }
        }
      }
      return res.json({ ...(await cardState(patient.id)), changed: true, notified });
    } catch {
      console.error("[patient-card] toggle failed");
      return res.status(500).json({ message: "تعذّر حفظ حالة البطاقة" });
    }
  });
}
