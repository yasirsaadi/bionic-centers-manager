//  **الفرعُ المُتاحُ له الملفّ يرى عملَ صاحبه في لوحة التصنيع** (ترحيل ٠٨٠).
//
//  شكلُ العطب المُبلَّغ من الإنتاج: ملفٌّ مسجَّلٌ في ذي قار أُتيح لكربلاء
//  وأُسنِد خبيرُه إلى خبير كربلاء، **والعمليةُ بقيت في فرعها**. فرآه الخبيرُ
//  (قائمتُه ترشّح برقم الخبير بلا شرط فرع) ولم يرَه مديرُ كربلاء (لوحتُه
//  كانت ترشّح بفرع الأمر وحده)، بينما يفتح ملفَّه طبيعياً.
//
//  حيٌّ على Postgres وعلى `listOrders`/`getOverview` الحقيقيتين.
//  التشغيل: `DATABASE_URL=… npm run test:manufacturing-share`
import { db } from "../db";
import { sql } from "drizzle-orm";
import * as store from "./store";

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m)); };

async function main() {
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;

  const bA = await one(sql`INSERT INTO branches (name) VALUES (${"فرع تسجيل " + t}) RETURNING id`);
  const bB = await one(sql`INSERT INTO branches (name) VALUES (${"فرع مُتاح " + t}) RETURNING id`);
  const bC = await one(sql`INSERT INTO branches (name) VALUES (${"فرع ثالث " + t}) RETURNING id`);
  const ex = await one(sql`
    INSERT INTO system_users (username, password_hash, display_name, role, branch_id, is_active)
    VALUES (${"exp" + t}, 'x', ${"خبير " + t}, 'prosthetics_expert', ${bB.id}, true) RETURNING id`);
  const p = await one(sql`
    INSERT INTO patients (name, phone, branch_id, is_amputee, patient_code, referral_source, age, medical_condition)
    VALUES (${"مريض مشترك " + t}, ${"0770" + t}, ${bA.id}, true, ${"WB-T" + t}, 'اختبار', 40, 'بتر') RETURNING id`);
  const wo = await one(sql`
    INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage)
    VALUES (${p.id}, ${bA.id}, 'prosthetic', 'initial_build', ${ex.id}, 'in_progress', 'measurement') RETURNING id`);

  const seen = async (scope: number[]) =>
    (await store.listOrders({ branchIds: scope } as any)).some((o: any) => o.id === Number(wo.id));

  try {
    console.log("\nأ — قبل الإتاحة");
    ok(await seen([Number(bA.id)]), "مديرُ فرع التسجيل يرى الأمر");
    ok(!(await seen([Number(bB.id)])), "ومديرُ الفرع الآخر لا يراه");
    ok((await store.listOrders({ expertUserId: Number(ex.id) } as any))
      .some((o: any) => o.id === Number(wo.id)), "والخبيرُ يراه بلا شرط فرع — شكلُ العطب");

    await db.execute(sql`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES (${p.id}, ${bB.id})`);

    console.log("\nب — بعد إتاحة الملفّ، والعمليةُ باقيةٌ في فرعها");
    ok(await seen([Number(bB.id)]), "مديرُ الفرع المُتاح صار يرى الأمر");
    ok(await seen([Number(bA.id)]), "ومديرُ فرع التسجيل ما زال يراه — الشرطُ اتّحادٌ لا استبدال");
    const row = await one(sql`SELECT branch_id FROM prosthetic_work_orders WHERE id = ${wo.id}`);
    ok(Number(row.branch_id) === Number(bA.id), "وفرعُ الأمر لم يتغيّر — النسبةُ للتقارير كما هي");
    const ov = await store.getOverview({ branchIds: [Number(bB.id)] } as any);
    ok(JSON.stringify(ov).includes(String(wo.id)) || JSON.stringify(ov).includes("خبير " + t),
      "ولوحةُ سير العمل تعدّه — نفسُ شرط القائمة");

    console.log("\nج — والعزلُ لم يضعف");
    ok(!(await seen([Number(bC.id)])), "فرعٌ ثالث بلا إتاحة لا يراه");
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id = ${p.id}`);
    ok(!(await seen([Number(bB.id)])), "وسحبُ الإتاحة يُخفيه ثانيةً");
  } finally {
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id = ${p.id}`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id = ${wo.id}`);
    await db.execute(sql`DELETE FROM patients WHERE id = ${p.id}`);
    await db.execute(sql`DELETE FROM system_users WHERE id = ${ex.id}`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bA.id}, ${bB.id}, ${bC.id})`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
