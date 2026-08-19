// نقاطُ اعتماد الخصم والتبرّع — **طابورٌ واحدٌ للأقسام الثلاثة**.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   قراءةُ الطابور   — المسؤول (كلُّ الفروع) · مديرُ الفرع (فرعُه) · المخوَّل
//   الحسمُ (اعتماد · رفض · تعديل واعتماد) — الثلاثةُ أنفسُهم، **في فرعِ الطلب**
//   الطلبُ نفسُه      — لا يُنشأ من هنا: تُنشئه نقاطُ التسعير القائمة، فلا
//                      بابَ تسعيرٍ ثانٍ يلتفّ على حُرّاسها.
//
// **وسلطةُ المسؤول تُفحَص أوّلاً** فلا يقيّدها دورٌ عاديّ يحمله.
//
// **ونطاقُ الفرع يُقرأ من صفّ الطلب** لا من جسم الرسالة: مديرُ فرعٍ لا
// يعتمد خصمَ فرعٍ آخر ولو ورد المعرّف صحيحاً.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import { DiscountError } from "./store";
import {
  canApproveServiceDiscount, discountReasonLabel, FREE_DONATION_LABEL,
} from "@shared/discount";

type Req = any;

export function getDiscountSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: (s?.permissions ?? {}) as Record<string, any>,
  };
}

/** الفروع التي يصلها المستخدم. `null` = مسؤول، أي كل الفروع. */
export function discountBranchScope(req: Req): number[] | null {
  const s = getDiscountSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

export function discountBranchInScope(req: Req, branchId: number | null): boolean {
  const scope = discountBranchScope(req);
  if (scope === null) return true;
  if (branchId === null) return false;
  return scope.includes(branchId);
}

/**
 * **هل يعتمد هذا المستخدم خصماً على هذا الفرع؟** — الدورُ والنطاقُ معاً.
 *
 * فصلُهما كان سيسمح لمدير فرعٍ باعتماد خصم فرعٍ آخر: يملك الدور، ولا يملك
 * الفرع. والاثنان شرطٌ واحد لا شرطان.
 */
export function mayApproveHere(req: Req, branchId: number | null): boolean {
  return canApproveServiceDiscount(getDiscountSession(req))
    && discountBranchInScope(req, branchId);
}

function fail(res: any, err: unknown): boolean {
  if (err instanceof DiscountError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

const money = (n: number) => Number(n || 0).toLocaleString();

/** سطرُ التدقيق — يُقرأ بعد سنة بلا فتح الجدول. */
export function discountAuditNote(r: store.DiscountRow, verb: string): string {
  const what = r.isFree
    ? `مجّاني (${FREE_DONATION_LABEL})`
    : `${money(r.originalPrice)} ⟶ ${money(r.approvedFinalPrice ?? r.proposedFinalPrice)} د.ع`
      + ` (خصم ${money(r.discountAmount)} = ${r.discountPercentage}%)`;
  return `${verb} خصم #${r.id} — ${what} — السبب: ${discountReasonLabel(r.reason)}`;
}

export function registerDiscountRoutes(app: Express, isAuthenticated: any) {
  // ── الطابور ──────────────────────────────────────────────────────────
  //  المعلَّقُ افتراضاً: الشاشةُ عملٌ ينتظر لا أرشيفٌ يُتصفَّح.
  app.get("/api/discounts", isAuthenticated, async (req: Req, res) => {
    const s = getDiscountSession(req);
    if (!canApproveServiceDiscount(s)) {
      return res.status(403).json({ error: "اعتماد الخصومات للمسؤول ومدير الفرع والمخوَّل" });
    }
    const rows = await store.listRequests({
      scope: discountBranchScope(req),
      status: typeof req.query?.status === "string" ? String(req.query.status) : undefined,
    });
    res.json({ requests: rows });
  });

  // ── طلباتُ مريضٍ واحد — شارةُ «خصم بانتظار الاعتماد» في ملفّه ─────────
  //  **قراءةٌ ضمن نطاق الفرع لكلّ من يفتح الملفّ**: الشارةُ معلومةٌ تشغيلية
  //  (الخدمة موقوفة) لا رقمٌ ماليّ يُحجَب.
  app.get("/api/discounts/patient/:patientId", isAuthenticated, async (req: Req, res) => {
    const patientId = Number(req.params.patientId);
    if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const rows = await store.listForPatient(patientId);
    const visible = rows.filter((r) => discountBranchInScope(req, r.branchId));
    res.json({ requests: visible });
  });

  // ── الحسم ────────────────────────────────────────────────────────────
  //  اعتماد · رفض · **تعديل واعتماد** — بابٌ واحد، فالثلاثةُ قرارٌ على الصفّ
  //  نفسه ولا يجوز أن تنحرف حُرّاسُها.
  app.post("/api/discounts/:id/decide", isAuthenticated, async (req: Req, res) => {
    const s = getDiscountSession(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّف غير صالح" });

    const existing = await store.getById(id);
    if (!existing) return res.status(404).json({ error: "الطلب غير موجود" });
    //  **الفرعُ يُقرأ من الصفّ** — والدورُ وحده لا يكفي.
    if (!mayApproveHere(req, existing.branchId)) {
      return res.status(403).json({
        error: canApproveServiceDiscount(s)
          ? "غير مصرح لك بهذا الفرع"
          : "اعتماد الخصومات للمسؤول ومدير الفرع والمخوَّل",
      });
    }

    const decision = req.body?.decision === "reject" ? "reject" : "approve";
    //  «تعديل واعتماد»: رقمٌ يخالف المقترح. وغيابُه يعني اعتمادَ المقترح كما هو.
    const raw = req.body?.finalPrice;
    const finalPrice = raw === undefined || raw === null || raw === ""
      ? null : Number(raw);
    if (finalPrice !== null && !Number.isFinite(finalPrice)) {
      return res.status(400).json({ error: "السعر المعدَّل غير صالح" });
    }

    try {
      const out = await store.decideDiscount({
        requestId: id, decision,
        finalPrice: decision === "approve" ? finalPrice : null,
        //  **ولا يصير الصفرُ تبرّعاً بالصمت**: علمٌ يرفعه المعتمِد صراحةً.
        isFree: req.body?.isFree === true,
        note: str(req.body?.note),
        actor: { userId: s.userId, userName: s.userName },
      });
      await logAudit({
        entityType: "service_discount", entityId: id,
        action: "update", userId: s.userId, userName: s.userName,
        branchId: out.request.branchId,
        oldValues: {
          status: existing.status, proposedFinalPrice: existing.proposedFinalPrice,
          isFree: existing.isFree,
        },
        newValues: {
          status: out.request.status, approvedFinalPrice: out.request.approvedFinalPrice,
          isFree: out.request.isFree, patientId: out.request.patientId,
          department: out.request.department,
        },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: discountAuditNote(out.request, decision === "approve" ? "اعتماد" : "رفض"),
      });
      res.json(out);
    } catch (e) {
      if (fail(res, e)) return;
      if ((e as any)?.name === "FollowupError" || (e as any)?.name === "DeviceEpisodeError") {
        return res.status((e as any).status ?? 409).json({ error: (e as any).message });
      }
      if ((e as any)?.name === "ActiveAssignmentError" || (e as any)?.code === "23505") {
        return res.status(409).json({
          error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — حدّث الصفحة",
        });
      }
      // ══ وأيُّ عطبٍ آخر يُقال صريحاً — **ولا يُترك معلَّقاً** ═══════════
      // الحسمُ والتنفيذُ معاملةٌ واحدة، فسقوطُها يعني أن **لا شيء وقع**:
      // الطلبُ ما زال معلَّقاً في الطابور والمال لم يُلمَس. والمعتمِدُ
      // يحتاج أن يعرف ذلك ليعيد المحاولة — لا طلباً مُعلَّقاً بلا جواب.
      console.error("[discounts] decide failed:", e);
      return res.status(500).json({
        error: "تعذّر تنفيذ الاعتماد — لم يُعتمد الطلب ولم يتغيّر شيء. حاول مجدداً.",
      });
    }
  });
}
