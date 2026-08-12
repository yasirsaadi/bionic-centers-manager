// نقاط إدارة روابط تواصل المريض — **لموظّفي المركز وحدهم**.
//
// ══ ما هذه الطبقة ═══════════════════════════════════════════════════════
// أربع نقاط داخلية مصادَق عليها: يُصدر الموظّف رابط ربط لمريض، ويرى حالة
// الربط، ويُلغي رابطاً معلَّقاً، ويسحب جهة اتصال نشطة. لا أكثر.
//
// ══ وما ليست ════════════════════════════════════════════════════════════
// **لا نقطة استهلاك.** `redeemLinkToken` تبقى دالّة داخلية لا يبلغها أحد من
// الإنترنت: القناة التي يصل بها الرابط إلى المريض ومَن يستهلكه قرارٌ لم
// يُحسم بعد، وفتح باب عامّ يقبل نصّ تذكرة قبل حسمه يعني بناء سطح هجومٍ
// لمعمارية لم تُختَر. ولا تلغرام ولا بوت ولا Gateway ولا webhook ولا QR
// ولا صفحة مريض ولا إشعارات ولا outbox — ولا سطر منها هنا.
//
// ══ الصلاحية: دورٌ ثم **نطاق فرع المريض** ═══════════════════════════════
// شرطان معاً، والثاني هو الحاسم: مسؤول عام، أو مدير فرع، أو موظّف استقبال
// يملك الوصول إلى المرضى — **وفي كل حال غير المسؤول يجب أن يكون فرع المريض
// نفسه ضمن فروع الموظّف**. والفرع يُقرأ من **صفّ المريض** لا من جسم الطلب
// ولا من مسار العنوان، فلا يُنتحل بإرسال رقم فرعٍ آخر.
//
// ولا اعتماد على إخفاء الواجهة: كل نقطة تفحص بنفسها، فحتى مَن يستدعيها
// بـcurl لا يتجاوز شيئاً.
//
// ══ ملكية المُعرّفات ════════════════════════════════════════════════════
// تذكرةٌ أو جهةُ اتصال لا تخصّ مريض المسار تُردّ **404 لا 403**: من زاوية
// هذا المريض هي غير موجودة فعلاً، والتفريق بين «موجودة وليست لك» و«غير
// موجودة» يكشف وجود صفوف لمرضى آخرين لمَن يعدّ المعرّفات.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import {
  createLinkToken, revokeLinkToken, revokeContact,
  listActiveContacts, listPendingTokens, getLinkToken, getContact,
  isContactChannel, isContactRelation,
} from "./store";

type Req = any;

/**
 * الحقول الوحيدة المقبولة في جسم إصدار التذكرة. **قائمة بيضاء لا سوداء**:
 * الحقل الذي يخترعه عميلٌ بعد سنة يُرفض بلا أن يعرفه أحد مسبقاً.
 *
 * وما يُرفض صراحةً بهذا: `ttlMs` (المهلة قرارُ الخادم لا العميل، وإلا طلب
 * أحدهم سنة) · `externalId` (الحساب يأتي عند الاستهلاك لا عند الإصدار) ·
 * `phone` (رقمٌ هنا يوحي بتحقّقٍ لم يجرِ) · `verified` و`status` (ادّعاء
 * حالة لا يسندها شيء).
 */
const ISSUE_ALLOWED_FIELDS_LIST = ["channel", "relation"] as const;
const ISSUE_ALLOWED_FIELDS = new Set<string>(ISSUE_ALLOWED_FIELDS_LIST);

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: (s?.permissions ?? {}) as Record<string, unknown>,
  };
}

/** فروع الموظّف. `null` = مسؤول، أي كل الفروع. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

/**
 * الدور المؤهَّل — قبل النظر في الفرع.
 *
 * ── العقد بالحرف ────────────────────────────────────────────────────────
 *   admin           ⇒ مسموح، وفي كل الفروع.
 *   branch_manager  ⇒ مسموح، ضمن فروعه.
 *   reception       ⇒ مسموح **إن** حمل `canViewPatients`، وضمن فروعه.
 *   وأي دورٍ آخر    ⇒ ممنوع، **ولو حمل `canViewPatients`**.
 *
 * ── ولماذا لا تكفي الصلاحية وحدها ───────────────────────────────────────
 * `canViewPatients` تعني «يرى ملفّات المرضى»، ويحملها اليوم الطبيب
 * والمعالج والمحاسب وخبير الأطراف — لأنهم يحتاجون قراءة الملفّ لعملهم. أما
 * **إصدار رابطٍ يربط حساباً خارجياً بملفّ مريض** فعملٌ إداري لا سريري ولا
 * محاسبي: مَن يقرأ الملفّ ليعالج ليس بالضرورة مَن يقرّر أن هذا الحساب يتبع
 * هذا المريض. فالدور شرطٌ أوّل لا تعوّضه صلاحيةُ قراءة.
 *
 * وهي **قائمة بيضاء بالأدوار**: الدور الذي يُضاف بعد سنة يُمنع افتراضاً حتى
 * يُذكر هنا صراحةً — والسهو يُغلق لا يُفتح.
 */
const MANAGER_ROLE = "branch_manager";
const RECEPTION_ROLE = "reception";

function mayManageCommunication(req: Req): boolean {
  const s = getSession(req);
  if (s.isAdmin) return true;
  if (s.role === MANAGER_ROLE) return true;
  if (s.role === RECEPTION_ROLE) return Boolean(s.permissions?.canViewPatients);
  return false;
}

interface ScopedPatient { id: number; branchId: number }

/**
 * يفحص الدور ثم يقرأ المريض ثم يفحص فرعه — بهذا الترتيب. الدور أولاً كي لا
 * يستكشف غيرُ المخوَّل وجودَ المرضى بعدّ المعرّفات: يُردّ 403 قبل أن يُسأل
 * عن الوجود أصلاً.
 *
 * يكتب الردّ بنفسه ويُرجع `null` عند المنع، فتبقى النقطة سطراً واحداً.
 */
async function resolvePatient(req: Req, res: any): Promise<ScopedPatient | null> {
  // نفس الصرامة لمعرّف المريض: `/patients/5.5/...` طلبٌ خاطئ لا مريضٌ يُبحث
  // عنه، فيُردّ ٤٠٠ صراحةً بدل ٤٠٤ يوحي بأن الرقم صالح والمريض غير موجود.
  const patientId = pathId(req.params.patientId);
  if (patientId === null) {
    res.status(400).json({ message: "معرّف مريض غير صالح" });
    return null;
  }
  if (!mayManageCommunication(req)) {
    res.status(403).json({ message: "غير مصرح" });
    return null;
  }
  const patient = await storage.getPatient(patientId);
  if (!patient) {
    res.status(404).json({ message: "المريض غير موجود" });
    return null;
  }
  const scope = branchScope(req);
  if (scope !== null && !scope.includes(patient.branchId)) {
    res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
    return null;
  }
  return { id: patientId, branchId: patient.branchId };
}

/**
 * معرّف من المسار: **عدد صحيح موجب أو لا شيء**.
 *
 * ولا تقريب إطلاقاً. `Math.round` كانت تحوّل `/link-tokens/1.7/revoke` إلى
 * التذكرة **٢** — صفٌّ لم يطلبه أحد، يُلغى بناءً على رقمٍ لم يُرسَل. وطلبٌ
 * بمعرّف غير صحيح خطأٌ في الطلب لا نيّةٌ تُخمَّن، فيُردّ ٤٠٠ ولا يُلمس صفّ.
 *
 * وهي مضبوطة على `0` و`-1` و`1.2` و`NaN` و`Infinity` و`""` وكلّها ترجع
 * `null`. (و`Number.isInteger` تكفي وحدها عن `isFinite`: اللانهاية ليست
 * صحيحة، والـNaN كذلك.)
 */
function pathId(raw: unknown): number | null {
  if (typeof raw === "string" && raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function registerPatientCommunicationRoutes(app: Express, isAuthenticated: any) {
  // ══ إصدار رابط ربط ═════════════════════════════════════════════════════
  // النصّ الخام يُعاد **هنا مرّة واحدة ولا مكان له غيرها**: ليس في القاعدة
  // (بصمته وحدها)، ولا في التدقيق، ولا في سجلّ الطلبات (محجوب بالاسم في
  // `log_redaction.ts`)، ولا في رسالة خطأ. مَن يفقده يُصدر غيره.
  app.post("/api/patients/:patientId/communication/link-tokens", isAuthenticated, async (req: Req, res) => {
    try {
      const patient = await resolvePatient(req, res);
      if (!patient) return;

      const body = (req.body ?? {}) as Record<string, unknown>;
      const rejected = Object.keys(body).filter((k) => !ISSUE_ALLOWED_FIELDS.has(k));
      if (rejected.length > 0) {
        // الرفض لا التجاهل: التجاهل يجعل العميل يظنّ أن `ttlMs` عُمِل به.
        return res.status(400).json({
          message: `حقول غير مسموحة: ${rejected.join("، ")}`,
          allowed: ISSUE_ALLOWED_FIELDS_LIST,
        });
      }
      if (!isContactChannel(body.channel)) {
        return res.status(400).json({ message: "قناة غير مدعومة" });
      }
      if (!isContactRelation(body.relation)) {
        return res.status(400).json({ message: "صلة غير صالحة" });
      }

      const s = getSession(req);
      // بلا `ttlMs` — المهلة الافتراضية (١٥ دقيقة) وحدها، فلا يُطيلها عميل.
      const { rawToken, token } = await createLinkToken({
        patientId: patient.id,
        channel: body.channel,
        relation: body.relation,
        createdByUserId: s.userId,
      });

      // تدقيق بلا سرّ: لا نصّ ولا بصمة ولا معرّف حساب — ولا واحدٌ منها
      // موجود أصلاً في هذه اللحظة عدا النصّ، وهو ما لا يُكتب.
      await logAudit({
        entityType: "patient_link_token",
        entityId: token.id,
        action: "link_token_created",
        userId: s.userId,
        userName: s.userName,
        branchId: patient.branchId,
        newValues: {
          patientId: patient.id,
          channel: token.channel,
          relation: token.relation,
          expiresAt: token.expiresAt,
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get?.("user-agent") ?? null,
      });

      // إسقاط صريح حقلاً بحقل — لا نشر للصفّ. الصفّ يحمل `tokenHash`، ونشرُه
      // كان سيُخرجه اليوم أو يُخرج أي عمود يُضاف غداً.
      return res.status(201).json({
        tokenId: token.id,
        rawToken,
        channel: token.channel,
        relation: token.relation,
        expiresAt: token.expiresAt,
      });
    } catch (err) {
      // رسالة عامّة: نصّ الاستثناء قد يحمل قيماً من الطلب.
      console.error("[communication] link-token issue failed");
      return res.status(500).json({ message: "تعذّر إصدار رابط الربط" });
    }
  });

  // ══ حالة الربط ═════════════════════════════════════════════════════════
  // ما يحتاجه موظّف الاستقبال ليعرف أين وصل: هل ارتبط حساب؟ وهل ثمّة رابطٌ
  // قائم؟ **ولا يحتاج معرّف حساب تلغرام** — فلا يُعرَض. والمسحوبة تاريخٌ لا
  // حاضر، فلا تدخل الردّ الافتراضي.
  app.get("/api/patients/:patientId/communication", isAuthenticated, async (req: Req, res) => {
    try {
      const patient = await resolvePatient(req, res);
      if (!patient) return;

      const [contacts, tokens] = await Promise.all([
        listActiveContacts(patient.id),
        listPendingTokens(patient.id),
      ]);

      return res.json({
        activeContacts: contacts.map((c) => ({
          id: c.id, channel: c.channel, relation: c.relation, linkedAt: c.linkedAt,
        })),
        pendingTokens: tokens.map((t) => ({
          id: t.id, channel: t.channel, relation: t.relation,
          expiresAt: t.expiresAt, createdAt: t.createdAt,
        })),
      });
    } catch (err) {
      console.error("[communication] status read failed");
      return res.status(500).json({ message: "تعذّر قراءة حالة التواصل" });
    }
  });

  // ══ إلغاء رابط معلَّق ═══════════════════════════════════════════════════
  // **والمستهلَكة لا تُلغى**: تذكرةٌ أنشأت جهة اتصال حدثٌ وقع، وختمها يقلب
  // معناها في السجلّ من «رُبِط بها حساب» إلى «أُلغيت» فيقرأ المدقّق تاريخاً
  // لم يحدث. مَن أراد فكّ الربط يسحب جهة الاتصال — والرسالة تقول ذلك.
  app.post("/api/patients/:patientId/communication/link-tokens/:tokenId/revoke", isAuthenticated, async (req: Req, res) => {
    try {
      const patient = await resolvePatient(req, res);
      if (!patient) return;

      const tokenId = pathId(req.params.tokenId);
      if (tokenId === null) return res.status(400).json({ message: "معرّف تذكرة غير صالح" });

      const token = await getLinkToken(tokenId);
      // ملكيةُ المُعرّف: 404 لا 403 — لا نكشف وجود تذاكر مرضى آخرين.
      if (!token || token.patientId !== patient.id) {
        return res.status(404).json({ message: "التذكرة غير موجودة لهذا المريض" });
      }
      if (token.consumedAt) {
        return res.status(409).json({
          message: "التذكرة استُهلكت ولا تُلغى. لفكّ الربط اسحب جهة الاتصال.",
        });
      }
      if (token.revokedAt) {
        // idempotent: الملغاة سلفاً ليست خطأً، والنداء الثاني يقول الحقيقة
        // نفسها بلا 500 ولا كتابة ثانية ولا قيد تدقيق مكرَّر.
        return res.json({ revoked: true, alreadyRevoked: true });
      }

      const ok = await revokeLinkToken(tokenId);
      if (!ok) {
        // سباق: استُهلكت أو أُلغيت بين القراءة والكتابة. نعيد القراءة
        // ونقول ما صار فعلاً بدل أن ندّعي نجاحاً لم يقع.
        const now = await getLinkToken(tokenId);
        if (now?.consumedAt) {
          return res.status(409).json({
            message: "التذكرة استُهلكت ولا تُلغى. لفكّ الربط اسحب جهة الاتصال.",
          });
        }
        return res.json({ revoked: true, alreadyRevoked: true });
      }

      const s = getSession(req);
      await logAudit({
        entityType: "patient_link_token",
        entityId: tokenId,
        action: "link_token_revoked",
        userId: s.userId,
        userName: s.userName,
        branchId: patient.branchId,
        newValues: {
          patientId: patient.id,
          channel: token.channel,
          relation: token.relation,
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get?.("user-agent") ?? null,
      });

      return res.json({ revoked: true, alreadyRevoked: false });
    } catch (err) {
      console.error("[communication] link-token revoke failed");
      return res.status(500).json({ message: "تعذّر إلغاء رابط الربط" });
    }
  });

  // ══ سحب جهة اتصال نشطة ═════════════════════════════════════════════════
  // **ختمٌ لا حذف، وبلا مساس بالصلة**: الصفّ يبقى يقول إلى الأبد أن هذا
  // الحساب كان مرتبطاً بهذه الصلة وحتى متى.
  app.post("/api/patients/:patientId/communication/contacts/:contactId/revoke", isAuthenticated, async (req: Req, res) => {
    try {
      const patient = await resolvePatient(req, res);
      if (!patient) return;

      const contactId = pathId(req.params.contactId);
      if (contactId === null) return res.status(400).json({ message: "معرّف جهة اتصال غير صالح" });

      const contact = await getContact(contactId);
      if (!contact || contact.patientId !== patient.id) {
        return res.status(404).json({ message: "جهة الاتصال غير موجودة لهذا المريض" });
      }

      const ok = await revokeContact(contactId);
      if (!ok) return res.json({ revoked: true, alreadyRevoked: true });

      const s = getSession(req);
      // بلا `externalId` — التدقيق يقول أي جهة سُحبت ومتى ومَن، لا أي حساب.
      await logAudit({
        entityType: "patient_contact",
        entityId: contactId,
        action: "patient_contact_revoked",
        userId: s.userId,
        userName: s.userName,
        branchId: patient.branchId,
        newValues: {
          patientId: patient.id,
          channel: contact.channel,
          relation: contact.relation,
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get?.("user-agent") ?? null,
      });

      return res.json({ revoked: true, alreadyRevoked: false });
    } catch (err) {
      console.error("[communication] contact revoke failed");
      return res.status(500).json({ message: "تعذّر سحب جهة الاتصال" });
    }
  });
}
