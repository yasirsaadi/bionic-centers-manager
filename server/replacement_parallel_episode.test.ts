// التصحيحُ الإداريّ وفتحُ البديل — **وعمليةٌ أخرى مستقلّةٌ حيّة على الخيط**.
// قاعدة محلّية: `npm run test:replacement-parallel-episode`.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// ترحيلُ ٠٧٣ رفع `uq_pde_case_open`: أيُّ عددٍ من عمليات الأجهزة المستقلّة
// لمريضٍ واحد على الخيط الواحد صحيحٌ الآن. و`startDeviceEpisodeTx` أسقط
// حارسَه يومَها — **و`createReplacementEpisodeTx` نُسيت**.
//
// فصار التصحيحُ الإداريّ يسقط **بكامله** حين يحمل الخيطُ عمليةً ثانيةً
// مستقلّةً حيّة: المنسّقُ يُبطل الخاطئة ويعكس مالَها ثمّ ينادي فتحَ البديل،
// فيرتدّ ٤٠٩ فتُرجع المعاملةُ كلَّها. **فالمريضُ محبوسٌ في خطئه لأن له
// عمليةً أخرى سليمة** — وتلك لا شأنَ لها بالتصحيح.
//
// ══ ما يحرسه هذا الملفّ ═══════════════════════════════════════════════════
// (أ) **التصحيحُ ينجح ويفتح البديلَ الصحيح** رغم العملية الأخرى الحيّة.
// (ب) **والأخرى لا تُمَسّ بايتاً** — لا حالةً ولا كلفةً ولا تسلسلاً ولا
//     إبطالاً، ولا متابعتُها ولا أمرُ عملها.
// (ج) **والتسلسلُ يبقى فريداً** — البديلُ يأخذ MAX+١ فوق الجميع.
// (د) **وحارسُ أمر البناء القديم بلا هويّة باقٍ كما هو** — يردّ ٤٠٩.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6879;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-البديل-مع-عملية-موازية";
const ADMIN = 9981, RECV = 9982, MGR = 9983, DOC = 9984, EXPERT = 9985;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: {
      canViewPatients: true, canAddPatients: true, canEditPatients: true,
      canDeletePatients: true, canViewPayments: true,
    },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let phoneSeq = 0;
async function mkPatient(label: string) {
  const phone = `0770${String(4500000 + (phoneSeq++)).padStart(7, "0")}`;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,$3,$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
    [`${MARK} ${label}`, MARK, phone]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function signExam(patientId: number, episodeId: number, price: number) {
  const res = await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), deviceEpisodeId: episodeId,
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
  });
  if (res.status < 300 && res.body?.id) {
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [res.body.id, price]);
  }
  return res;
}
const followupOfEpisode = async (episodeId: number) =>
  (await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`,
    [episodeId]))[0] ?? null;

/** عمليةٌ مباعة على الخيط المعطى: حلقة ⟶ معاينة ⟶ خبير ⟶ شراء ⟶ أمر. */
async function soldOnCase(patientId: number, item: string, price: number) {
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR, requestedItem: item as any,
  });
  const episodeId = Number((ep as any).id ?? ep);
  await signExam(patientId, episodeId, price);
  const f = await followupOfEpisode(episodeId);
  await http("POST", `/api/followups/${f!.id}/expert`, S.recv, { expertUserId: EXPERT });
  await http("POST", `/api/followups/${f!.id}/confirm-purchase`, S.recv, {});
  const [wo] = await q(
    `SELECT id FROM prosthetic_work_orders WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`,
    [episodeId]);
  return { episodeId, followupId: Number(f!.id), workOrderId: Number(wo?.id ?? 0) };
}

/** بصمةُ حلقةٍ بعينها وكلِّ ما يتدلّى منها. */
async function fingerprint(episodeId: number) {
  const [ep] = await q(
    `SELECT id, case_id, patient_id, branch_id, sequence_number, status,
            agreed_cost::int AS cost, requested_item, component, service_path,
            admin_void_reversal_id, delivered_at
       FROM patient_device_episodes WHERE id=$1`, [episodeId]);
  const fus = await q(
    `SELECT id, status, approved_price::int AS price, converted_work_order_id, closed_reason
       FROM post_exam_followups WHERE device_episode_id=$1 ORDER BY id`, [episodeId]);
  const wos = await q(
    `SELECT id, status, current_stage, expert_user_id, admin_void_reversal_id
       FROM prosthetic_work_orders WHERE device_episode_id=$1 ORDER BY id`, [episodeId]);
  const exams = await q(
    `SELECT id, device_episode_id FROM medical_exams WHERE device_episode_id=$1 ORDER BY id`,
    [episodeId]);
  const cancels = await q(
    `SELECT c.exam_id FROM medical_exam_cancellations c
       JOIN medical_exams e ON e.id = c.exam_id
      WHERE e.device_episode_id=$1 ORDER BY c.id`, [episodeId]);
  return { ep, fus, wos, exams, cancels };
}
const episodesOfCase = (caseId: number) => q(
  `SELECT id, sequence_number AS seq, status, agreed_cost::int AS cost, requested_item
     FROM patient_device_episodes WHERE case_id=$1 ORDER BY id`, [caseId]);

const preview = (target: any) =>
  http("POST", "/api/admin/operation-reversal/preview", S.admin, target);
async function reverse(body: any) {
  const pv = await preview({ followupId: body?.followupId ?? null });
  return {
    pv,
    res: await http("POST", "/api/admin/operation-reversal/execute", S.admin,
      { ...body, stateStamp: pv.body?.stateStamp }),
  };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [MGR, "branch_manager", "مدير الفرع", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `rpe_u${id}`, name, role, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. الواقعة: تصحيحٌ واستبدال، وعمليةٌ ثانيةٌ حيّةٌ على الخيط نفسه ══
    console.log("\n── أ. عمليةٌ أخرى مستقلّةٌ حيّة على الخيط ──");
    {
      const patientId = await mkPatient("الواقعة");
      const caseId = await mkCase(patientId);

      //  العمليةُ الخاطئة: طرفٌ كامل بِيع وبدأ تصنيعُه.
      const wrong = await soldOnCase(patientId, "full_device", 1_000_000);
      //  **والعمليةُ الثانية — مستقلّةٌ تماماً وحيّة** على الخيط نفسِه
      //  (قانونيّةٌ منذ ترحيل ٠٧٣): قالبٌ بِيع وبدأ تصنيعُه هو الآخر.
      const other = await soldOnCase(patientId, "socket", 400_000);

      const eps0 = await episodesOfCase(caseId);
      same("١. على الخيط عمليتان مستقلّتان", eps0.length, 2);
      check(eps0.every((e: any) => e.status === "in_manufacturing"),
        "   وكلتاهما حيّةٌ قيد التصنيع", JSON.stringify(eps0));

      const otherBefore = await fingerprint(other.episodeId);
      const otherFuBefore = await q(
        `SELECT id, status FROM post_exam_followups WHERE id=$1`, [other.followupId]);

      //  ── التصحيحُ مع استبدالِ المطلوب: طرفٌ كامل ⟶ قالب ──
      const { pv, res } = await reverse({
        followupId: wrong.followupId, intent: "replace_requested_item",
        reasonNote: "طُلب طرفٌ كامل والصحيحُ قالب",
        replacementRequestedItem: "socket",
      });
      check(pv.status < 300 && (pv.body?.replacementOptions ?? []).length > 0,
        "٢. المعاينةُ تعرض خياراتِ الاستبدال", JSON.stringify(pv.body?.replacementOptions));
      check(res.status < 300, "٣. **والتصحيحُ ينجح** رغم العملية الأخرى الحيّة",
        JSON.stringify(res.body));

      const newId = Number(res.body?.replacementEpisodeId ?? 0);
      check(newId > 0, "٤. **وفُتح البديلُ الصحيح**", JSON.stringify(res.body));

      const [fresh] = await q(
        `SELECT status, agreed_cost::int AS cost, requested_item, service_path,
                case_id, sequence_number AS seq, admin_void_reversal_id
           FROM patient_device_episodes WHERE id=$1`, [newId]);
      same("٥. والبديلُ يبدأ من أوّل الطريق بما طُلب صحيحاً",
        [fresh?.status, fresh?.cost, fresh?.requested_item, Number(fresh?.case_id)],
        ["awaiting_exam", 0, "socket", caseId]);

      //  ── **والأخرى لم تُمَسّ بايتاً** ──
      const otherAfter = await fingerprint(other.episodeId);
      same("٦. **العمليةُ الأخرى كما كانت تماماً** — حلقةً ومتابعةً وأمراً ومعاينة",
        otherAfter, otherBefore);
      same("   ولم تُبطَل إدارياً", otherAfter.ep?.admin_void_reversal_id, null);
      same("   ومتابعتُها حيّةٌ كما كانت",
        await q(`SELECT id, status FROM post_exam_followups WHERE id=$1`, [other.followupId]),
        otherFuBefore);

      //  ── والخاطئةُ وحدَها أُبطلت ──
      const [wrongEp] = await q(
        `SELECT status, admin_void_reversal_id FROM patient_device_episodes WHERE id=$1`,
        [wrong.episodeId]);
      check(String(wrongEp?.status) === "cancelled" && wrongEp?.admin_void_reversal_id !== null,
        "٧. **والخاطئةُ وحدَها أُبطلت**", JSON.stringify(wrongEp));

      //  ── والتسلسلُ فريدٌ فوق الجميع ──
      const eps1 = await episodesOfCase(caseId);
      const seqs = eps1.map((e: any) => Number(e.seq));
      same("٨. ثلاثُ حلقاتٍ على الخيط", eps1.length, 3);
      same("٩. **والتسلسلُ فريدٌ لا يتكرّر**", seqs.length, new Set(seqs).size);
      same("١٠. **والبديلُ أخذ الأعلى**", Number(fresh?.seq), Math.max(...seqs));
    }

    // ══ ب. الضابط: بلا عمليةٍ أخرى — كما كان تماماً ══════════════════════
    console.log("\n── ب. الضابط — عمليةٌ وحيدة ──");
    {
      const patientId = await mkPatient("الضابط");
      const caseId = await mkCase(patientId);
      const wrong = await soldOnCase(patientId, "full_device", 700_000);

      const { res } = await reverse({
        followupId: wrong.followupId, intent: "replace_requested_item",
        reasonNote: "استبدالٌ عاديّ",
        replacementRequestedItem: "socket",
      });
      check(res.status < 300, "١١. التصحيحُ ينجح", JSON.stringify(res.body));
      const newId = Number(res.body?.replacementEpisodeId ?? 0);
      const [fresh] = await q(
        `SELECT status, agreed_cost::int AS cost, requested_item
           FROM patient_device_episodes WHERE id=$1`, [newId]);
      same("١٢. **والبديلُ كما كان** — لا ارتداد",
        [fresh?.status, fresh?.cost, fresh?.requested_item],
        ["awaiting_exam", 0, "socket"]);
      same("   وحلقتان على الخيط", (await episodesOfCase(caseId)).length, 2);
    }

    // ══ ج. حارسُ أمر البناء القديم بلا هويّة — **باقٍ كما هو** ════════════
    console.log("\n── ج. أمرُ بناءٍ قديمٌ نشطٌ بلا حلقة ──");
    {
      const patientId = await mkPatient("القديم");
      await mkCase(patientId);
      const wrong = await soldOnCase(patientId, "full_device", 500_000);

      //  أمرُ بناءٍ نشطٌ **بلا هويّة حلقة** — جهازٌ يُصنَع بالمسار القديم.
      await q(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, service_type, purpose, status, current_stage,
            expert_user_id, device_episode_id)
         VALUES ($1,1,'prosthetic','initial_build','in_progress','measurement',$2,NULL)`,
        [patientId, EXPERT]);

      const { res } = await reverse({
        followupId: wrong.followupId, intent: "replace_requested_item",
        reasonNote: "استبدالٌ فوق أمرٍ قديم",
        replacementRequestedItem: "socket",
      });
      same("١٣. **الحارسُ القديم باقٍ** — يُردّ ٤٠٩", res.status, 409);
      check(String(res.body?.message ?? res.body?.error ?? "").includes("أمر تصنيع نشط"),
        "   برسالته هو", JSON.stringify(res.body));
      //  والتصحيحُ كلُّه تراجع — لا صفَّ تصحيحٍ ولا بديل.
      same("١٤. **وصفرُ كتابة**: لا صفَّ تصحيح",
        await q(`SELECT id FROM administrative_operation_reversals WHERE patient_id=$1`,
          [patientId]), []);
      const [stillWrong] = await q(
        `SELECT status, admin_void_reversal_id FROM patient_device_episodes WHERE id=$1`,
        [wrong.episodeId]);
      same("   والعمليةُ الخاطئة كما هي",
        [String(stillWrong?.status), stillWrong?.admin_void_reversal_id],
        ["in_manufacturing", null]);
    }

    // ══ د. حارسٌ معماريّ ══════════════════════════════════════════════════
    console.log("\n── د. الحارسُ المعماريّ ──");
    {
      const { readFileSync } = await import("fs");
      const src = readFileSync("server/device_episodes/store.ts", "utf8");
      const fn = src.slice(src.indexOf("export async function createReplacementEpisodeTx"));
      const body = fn.slice(0, fn.indexOf("\n}\n") + 3);
      check(!body.includes("لا يمكن فتح طلب بديل فوقه"),
        "١٥. **لا حارسَ «حلقةٌ مفتوحةٌ قائمة» بقي**", "");
      check(body.includes("FOR UPDATE"), "١٦. **والقفلُ على صفّ الخيط باقٍ**", "");
      check(body.includes("MAX(sequence_number)"), "١٧. **والتسلسلُ يُحسَب تحت القفل**", "");
      check(body.includes("device_episode_id IS NULL")
        && body.includes("purpose = 'initial_build'"),
        "١٨. **وحارسُ أمر البناء القديم بلا هويّة باقٍ**", "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص البديل مع عمليةٍ موازية نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
