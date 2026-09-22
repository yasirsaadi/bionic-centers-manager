//  **مراجعةُ الحركة تتبع إتاحةَ الملفّ** (ترحيل ٠٨٠ · §4.t).
//
//  قاعدةُ المالك ٢٠٢٦-٠٩-٢٢: «أما مراجعة الحركة فهنا من كل ولابد ان تظهر
//  للكل لانها مهمة تخبر الفرع الجديد ماذا فعل بالقديم وتخبر القديم ماذا
//  سيفعل في الجديد **بشرط ان تظهر بوضوح وتقسم احداث كل فرع بمعزل عن
//  الاخر**».
//
//  فالسطحان — طابورُ «مراجعة حركة مرضى الأطراف والمساند» وتاريخُ طلبات
//  المريض في ملفّه — صارا يقرآن باتّحاد §4.t: فرعُ الطلب في النطاق **أو**
//  الفرعُ يصل ملفَّ المريض. ومعه اسمُ فرع كلّ طلبٍ في الصفّ نفسِه.
//
//  **وما لم يُمَسّ ويُثبَت هنا**: طابورُ معاينة الطبيب (`pendingFullRequestsFor`)
//  وقسمُ المعاينات المنتظرة في سطح الإشراف (`listPendingFullRequests`) —
//  كلاهما يبقى بفرع الطلب بقرار المالك («ان عاين في ذي قار فبالمعاينة تبقى
//  ذي قار»).
//
//  حيٌّ على Postgres وعلى دوالّ المخزن الحقيقية.
//  التشغيل: `DATABASE_URL=… npm run test:review-share`
import { db } from "../db";
import { sql } from "drizzle-orm";
import * as store from "./store";

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m)); };

const SPEC = ["prosthetic", "medical_support"] as const;

async function main() {
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;

  const bA = await one(sql`INSERT INTO branches (name) VALUES (${"فرع تسجيل " + t}) RETURNING id`);
  const bB = await one(sql`INSERT INTO branches (name) VALUES (${"فرع مُتاح " + t}) RETURNING id`);
  const bC = await one(sql`INSERT INTO branches (name) VALUES (${"فرع ثالث " + t}) RETURNING id`);
  const A = Number(bA.id), B = Number(bB.id), C = Number(bC.id);

  const mk = async (name: string, branch: number) => Number((await one(sql`
    INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
    VALUES (${name + " " + t}, ${"0770" + t}, ${branch}, true, 'اختبار', 40, 'بتر')
    RETURNING id`)).id);

  //  المريضُ المشترك: سُجّل في «أ»، وطلبُ مراجعته وقع في «أ».
  const p = await mk("مريض مشترك", A);
  //  ومريضُ الفرع الثالث: لا إتاحةَ له إطلاقاً — حارسُ العزل.
  const z = await mk("مريض فرع ثالث", C);

  //  اختصاصان مختلفان للطلبين على المريض نفسِه — `uq_mrr_pending_bare`
  //  يمنع معلَّقَين عاريَين لنفس (المريض، الخدمة).
  const req = async (
    patient: number, branch: number, path: "quick" | "full", service: string,
  ) => Number((await one(sql`
    INSERT INTO medical_review_requests
      (patient_id, service_type, branch_id, requested_path, review_kind, status)
    VALUES (${patient}, ${service}, ${branch}, ${path},
            ${path === "quick" ? "maintenance" : "new_device"}, 'pending')
    RETURNING id`)).id);

  const rQuick = await req(p, A, "quick", "prosthetic");       // بطاقةُ حركةٍ في «أ»
  const rFull  = await req(p, A, "full", "medical_support");   // طلبُ معاينةٍ كاملة في «أ»
  const rZ     = await req(z, C, "quick", "prosthetic");       // حركةُ فرعٍ ثالث

  const queue = async (scope: number[] | null) =>
    store.listPendingReviews({ branchIds: scope, specialties: SPEC, window: "all" });
  const inQueue = async (scope: number[] | null, id: number) =>
    (await queue(scope)).some((r: any) => r.id === id);
  const inHistory = async (scope: number[] | null, id: number) =>
    (await store.listReviewsForPatient(p, scope)).some((r: any) => r.id === id);
  const inFullList = async (scope: number[] | null, id: number) =>
    (await store.listPendingFullRequests({ branchIds: scope, specialties: SPEC }))
      .some((r: any) => r.id === id);
  const inDoctorWorklist = async (scope: number[] | null, id: number) =>
    (await store.pendingFullRequestsFor({ patientIds: [p], branchIds: scope }))
      .some((r: any) => r.requestId === id);

  try {
    console.log("\nأ — قبل الإتاحة (شكلُ العطب)");
    ok(await inQueue([A], rQuick), "فرعُ التسجيل يرى بطاقةَ الحركة");
    ok(!(await inQueue([B], rQuick)), "والفرعُ الآخر لا يراها");
    ok(!(await inHistory([B], rQuick)), "ولا يرى تاريخَ الطلبات في الملفّ");

    console.log("\nب — بعد الإتاحة");
    await db.execute(sql`
      INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name)
      VALUES (${p}, ${B}, 'اختبار')`);
    ok(await inQueue([B], rQuick), "الفرعُ المضاف يرى بطاقةَ الحركة");
    ok(await inHistory([B], rQuick), "ويرى تاريخَ الطلبات في الملفّ");
    ok(await inQueue([A], rQuick), "وفرعُ التسجيل ما زال يراها — أوسعُ لا أضيق");
    ok(await inHistory([A], rQuick), "وتاريخُه كما كان");

    console.log("\nج — الأحداثُ مفصولةٌ بفرعها");
    const card = (await queue([B])).find((r: any) => r.id === rQuick);
    ok(card ? Number(card.branchId) === A : false, "البطاقةُ تحمل رقمَ الفرع الذي وقع فيه الطلب");
    ok(card?.branchName === "فرع تسجيل " + t, "وتحمل اسمَه — لا يُقرأ فرعان سطراً واحداً");
    const hist = (await store.listReviewsForPatient(p, [B])).find((r: any) => r.id === rQuick);
    ok(hist?.branchName === "فرع تسجيل " + t, "وسطرُ تاريخِ الملفّ يسمّي فرعَه كذلك");

    console.log("\nد — فرعُ الطلب لم يتغيّر");
    const row = await one(sql`SELECT branch_id FROM medical_review_requests WHERE id = ${rQuick}`);
    ok(Number(row.branch_id) === A, "صفُّ الطلب ما زال بفرع التسجيل — قراءةٌ لا كتابة");

    console.log("\nهـ — والعزلُ لم يضعف");
    ok(!(await inQueue([B], rZ)), "مريضُ فرعٍ ثالث بلا إتاحة لا يُرى");
    ok(!(await store.listReviewsForPatient(z, [B])).length, "ولا تاريخُ طلباته");
    ok(await inQueue([C], rZ), "وفرعُه يراه");

    console.log("\nو — ما بقي بفرعه بقرار المالك");
    ok(await inFullList([A], rFull), "طلبُ المعاينة الكاملة يظهر لفرع الطلب");
    ok(!(await inFullList([B], rFull)), "ولا يظهر للفرع المضاف — «بالمعاينة تبقى ذي قار»");
    ok(await inDoctorWorklist([A], rFull), "وطابورُ معاينة الطبيب بفرع الطلب");
    ok(!(await inDoctorWorklist([B], rFull)), "ولا يصل الفرعَ المضاف");

    console.log("\nز — والسحبُ يُخفيها من جديد");
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id = ${p} AND branch_id = ${B}`);
    ok(!(await inQueue([B], rQuick)), "بعد سحب الإتاحة لا يراها الفرعُ المضاف");
    ok(!(await inHistory([B], rQuick)), "ولا تاريخَها");
    ok(await inQueue([A], rQuick), "وفرعُ التسجيل كما كان");

    console.log("\nح — والمسؤولُ العام يرى الكلّ كما كان");
    ok(await inQueue(null, rQuick), "بطاقةُ «أ»");
    ok(await inQueue(null, rZ), "وبطاقةُ «ج»");
  } finally {
    await db.execute(sql`DELETE FROM medical_review_requests WHERE patient_id IN (${p}, ${z})`);
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id IN (${p}, ${z})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${p}, ${z})`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${A}, ${B}, ${C})`);
  }

  console.log(`\nنجح ${pass} · أخفق ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
