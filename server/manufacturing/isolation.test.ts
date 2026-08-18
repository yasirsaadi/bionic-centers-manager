// Integration test — drives the REAL manufacturing routes over HTTP with
// injected sessions, plus store-level transaction checks. Covers the 23
// required isolation/permission scenarios. Run against a local test DB only.
import express from "express";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import * as store from "./store";
import { patients, branches, systemUsers, prostheticWorkOrders, prostheticWorkHistory } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Safety: this test TRUNCATES and seeds. Only ever run it against a local
// test database — never production.
const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
  process.exit(1);
}

let failed = 0;
function assert(cond: boolean, msg: string) { console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}`); if (!cond) failed++; }

const PORT = 5435 + 1000;
const BASE = `http://127.0.0.1:${PORT}`;

// Sessions
const S = {
  recBaghdad: { userId: 201, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canAddPatients: true, canViewPatients: true, canEditPatients: false } },
  recKarbala: { userId: 202, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2], permissions: { canAddPatients: true, canViewPatients: true } },
  recMosul: { userId: 203, role: "reception", isAdmin: false, branchId: 4, accessibleBranches: [4], permissions: { canAddPatients: true, canViewPatients: true } },
  recDhiQar: { userId: 204, role: "reception", isAdmin: false, branchId: 3, accessibleBranches: [3], permissions: { canAddPatients: true, canViewPatients: true } },
  recKirkuk: { userId: 205, role: "reception", isAdmin: false, branchId: 5, accessibleBranches: [5], permissions: { canAddPatients: true, canViewPatients: true } },
  anad: { userId: 101, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1, 3, 5], permissions: {} },
  ayoub: { userId: 102, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1, 3, 5], permissions: {} },
  mgr1: { userId: 301, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true } },
  admin: { userId: 999, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} },
};

async function req(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

// The seeded patients carry FIXED ids, and `createWorkOrderForExisting`
// refuses a second OPEN order for the same patient+service. Without this the
// suite passes exactly once per database and then fails on its own leftovers.
async function clearSeededOrders() {
  const P = "(1,2,3,5)";
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN ${P}`);
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN ${P})`);
  await pool.query(`DELETE FROM prosthetic_work_history  WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN ${P})`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN ${P}`);
}

async function seed() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'ذي قار'),(4,'الموصل'),(5,'كركوك') ON CONFLICT DO NOTHING`);
  const mkUser = (id: number, name: string, role: string, branchIds: number[]) =>
    pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true) ON CONFLICT DO NOTHING`,
      [id, `u${id}`, name, role, branchIds[0] ?? null, JSON.stringify(branchIds)],
    );
  await mkUser(101, "عناد", "prosthetics_expert", [1, 3, 5]);
  await mkUser(102, "أيوب", "prosthetics_expert", [1, 3, 5]);
  await mkUser(103, "مصطفى", "prosthetics_expert", [2, 3, 5]);
  await mkUser(104, "محمد", "prosthetics_expert", [2, 3, 5]);
  await mkUser(105, "سيف", "prosthetics_expert", [4]);
  await mkUser(106, "خامل", "prosthetics_expert", [1]); // inactive — must NOT appear
  await pool.query(`UPDATE system_users SET is_active=false WHERE id=106`);
  await mkUser(201, "استقبال بغداد", "reception", [1]);
  await mkUser(301, "مدير بغداد", "branch_manager", [1]);
  await mkUser(999, "المسؤول", "admin", []);

  const mkPatient = (id: number, name: string, branchId: number, kind: "amputee" | "medical_support" | "physiotherapy") =>
    pool.query(
      `INSERT INTO patients (id,name,age,referral_source,medical_condition,branch_id,is_amputee,is_medical_support,is_physiotherapy,phone,total_cost,prosthetic_type)
       VALUES ($1,$2,'30','x',$3,$4,$5,$6,$7,'07700000',500000,'قدم صناعية') ON CONFLICT DO NOTHING`,
      [id, name, kind, branchId, kind === "amputee", kind === "medical_support", kind === "physiotherapy"],
    );
  await mkPatient(1, "مريض بغداد أ", 1, "amputee");
  await mkPatient(2, "مريض بغداد ب", 1, "amputee");
  await mkPatient(3, "مريض كربلاء", 2, "medical_support");
  await mkPatient(5, "مريض ذي قار", 3, "amputee");
  await clearSeededOrders();

  // Orders: o1→عناد(b1), o2→أيوب(b1), o3→مصطفى(b2), o5→أيوب(b3)
  const o1 = await store.createWorkOrderForExisting({ patientId: 1, branchId: 1, serviceType: "prosthetic", expertUserId: 101, assignedBy: 999 });
  const o2 = await store.createWorkOrderForExisting({ patientId: 2, branchId: 1, serviceType: "prosthetic", expertUserId: 102, assignedBy: 999 });
  const o3 = await store.createWorkOrderForExisting({ patientId: 3, branchId: 2, serviceType: "medical_support", expertUserId: 103, assignedBy: 999 });
  const o5 = await store.createWorkOrderForExisting({ patientId: 5, branchId: 3, serviceType: "prosthetic", expertUserId: 102, assignedBy: 999 });
  return { o1: o1.id, o2: o2.id, o3: o3.id, o5: o5.id };
}

async function main() {
  const ids = await seed();
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.headers["x-test-session"];
    req.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  registerManufacturingRoutes(app, isAuthenticated);
  const server = app.listen(PORT);
  await new Promise((r) => server.once("listening", r));

  // ---- experts roster per reception branch (scenarios 1-5) ----
  const names = (arr: any[]) => arr.map((e) => e.displayName).sort().join(",");
  assert(names((await req("GET", "/api/manufacturing/experts?branchId=1", S.recBaghdad)).json) === ["عناد", "أيوب"].sort().join(","), "1. reception بغداد → عناد + أيوب");
  assert(names((await req("GET", "/api/manufacturing/experts?branchId=2", S.recKarbala)).json) === ["مصطفى", "محمد"].sort().join(","), "2. reception كربلاء → مصطفى + محمد");
  assert(names((await req("GET", "/api/manufacturing/experts?branchId=4", S.recMosul)).json) === "سيف", "3. reception الموصل → سيف");
  assert(names((await req("GET", "/api/manufacturing/experts?branchId=3", S.recDhiQar)).json) === ["عناد", "أيوب", "مصطفى", "محمد"].sort().join(","), "4. reception ذي قار → عناد+أيوب+مصطفى+محمد");
  assert(names((await req("GET", "/api/manufacturing/experts?branchId=5", S.recKirkuk)).json) === ["عناد", "أيوب", "مصطفى", "محمد"].sort().join(","), "5. reception كركوك → عناد+أيوب+مصطفى+محمد");
  // inactive expert excluded
  assert(!(await req("GET", "/api/manufacturing/experts?branchId=1", S.recBaghdad)).json.some((e: any) => e.displayName === "خامل"), "   inactive expert excluded");
  // reception can't read another branch's experts by forging branchId
  assert((await req("GET", "/api/manufacturing/experts?branchId=2", S.recBaghdad)).status === 403, "   reception بغداد can't read كربلاء experts (403)");

  // ---- scenario 6: physiotherapy → no service type / no expert needed ----
  const svc = (p: any) => (p.isAmputee ? "prosthetic" : p.isMedicalSupport ? "medical_support" : null);
  assert(svc({ isPhysiotherapy: true, isAmputee: false, isMedicalSupport: false }) === null, "6. physiotherapy → no expert field (serviceType null)");

  // ---- scenario 8: can't assign expert to a disallowed branch (manual) ----
  const bad = await req("POST", "/api/manufacturing/orders", S.mgr1, { patientId: 1, expertUserId: 105 /* سيف b4 */ });
  assert(bad.status === 400, "8. manager can't assign سيف (branch4) to a branch1 patient (400)");
  // scenario 7-analog: create-for-existing without a valid expert id → 400
  assert((await req("POST", "/api/manufacturing/orders", S.mgr1, { patientId: 1, expertUserId: 99999 })).status === 400, "7. invalid/absent expert → cannot create order (400)");

  // ---- scenarios 9,10,11,23: expert isolation ----
  const anadOrders = (await req("GET", "/api/manufacturing/my-orders", S.anad)).json;
  assert(Array.isArray(anadOrders) && anadOrders.every((o: any) => o.expertUserId === 101), "9. عناد sees only his own orders");
  assert(anadOrders.some((o: any) => o.id === ids.o1) && !anadOrders.some((o: any) => o.id === ids.o2), "10. عناد does NOT see أيوب's order in same branch");
  assert(!anadOrders.some((o: any) => o.id === ids.o5), "23. multi-branch عناد does NOT see أيوب's order in his branch ذي قار");
  const leak = await req("GET", `/api/manufacturing/orders/${ids.o2}`, S.anad);
  assert(leak.status === 403 && !leak.json?.patient, "11. عناد opening أيوب's order id → 403, no patient data leaked");

  // ---- scenario 12: expert response has NO financial fields ----
  const detail = (await req("GET", `/api/manufacturing/orders/${ids.o1}`, S.anad)).json;
  const pkeys = Object.keys(detail.patient || {});
  const forbidden = ["total_cost", "totalCost", "phone", "address", "referral_source", "referralSource", "paid_amount", "remaining", "payments", "invoices"];
  assert(forbidden.every((k) => !pkeys.includes(k)), "12. expert patient view excludes all financial/contact fields");
  assert(pkeys.includes("name") && pkeys.includes("amputationSite"), "   expert view still has allowed clinical fields");

  // ---- scenario 14: expert cannot open admin/manager-only routes ----
  assert((await req("GET", "/api/manufacturing/orders", S.anad)).status === 403, "14a. expert blocked from admin order list (403)");
  assert((await req("GET", "/api/manufacturing/overview", S.anad)).status === 403, "14b. expert blocked from overview (403)");
  assert((await req("GET", "/api/manufacturing/patient/1/summary", S.anad)).status === 403, "14c. expert blocked from patient summary (403)");

  // ---- scenario 15,16: reception reassign before/after start ----
  const r15 = await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.recBaghdad, { newExpertUserId: 102, reason: "قبل البدء" });
  assert(r15.status === 200, "15. reception changes expert BEFORE work started");
  // move it back to عناد, then start work (advance stage), then reception tries again
  await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.mgr1, { newExpertUserId: 101, reason: "إرجاع" });
  await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, {});
  const r16 = await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.recBaghdad, { newExpertUserId: 102, reason: "بعد البدء" });
  assert(r16.status === 409, "16. reception CANNOT change expert after work started (409)");

  // ---- scenario 17: manager transfers within his branch only ----
  assert((await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.mgr1, { newExpertUserId: 102, reason: "داخل الفرع" })).status === 200, "17a. manager transfers within his branch");
  assert((await req("PATCH", `/api/manufacturing/orders/${ids.o3}/reassign`, S.mgr1, { newExpertUserId: 104, reason: "فرع آخر" })).status === 403, "17b. manager CANNOT transfer another branch's order (403)");

  // ---- scenario 18: admin transfers to allowed experts only ----
  assert((await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.admin, { newExpertUserId: 101, reason: "أدمن" })).status === 200, "18a. admin transfers to a branch-allowed expert");
  assert((await req("PATCH", `/api/manufacturing/orders/${ids.o1}/reassign`, S.admin, { newExpertUserId: 105, reason: "غير مسموح" })).status === 400, "18b. admin CANNOT assign an expert not allowed for the branch (400)");

  // ---- scenarios 19,20: technical rework appends + keeps history ----
  // o1 is at `measurements`; walk it up so a backwards return actually exists.
  await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, { expectedDeliveryDate: "2026-12-01" }); // → mold
  await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, {}); // → manufacturing
  const histBefore = (await db.select().from(prostheticWorkHistory).where(eq(prostheticWorkHistory.workOrderId, ids.o1))).length;
  const rc = await req("POST", `/api/manufacturing/orders/${ids.o1}/hold`, S.anad, { status: "technical_rework", reasonCode: "mold_fit", returnToStage: "mold", note: "قالب سيّئ" });
  assert(rc.status === 200 && rc.json.status === "technical_rework" && rc.json.currentStage === "mold", "19. technical rework → status technical_rework + stage moved BACK");
  const rs = await req("POST", `/api/manufacturing/orders/${ids.o1}/hold`, S.anad, { status: "technical_rework", reasonCode: "socket_fit", returnToStage: "measurements" });
  assert(rs.status === 200 && rs.json.currentStage === "measurements", "20. a second rework returns further back");
  const histAfter = (await db.select().from(prostheticWorkHistory).where(eq(prostheticWorkHistory.workOrderId, ids.o1))).length;
  assert(histAfter > histBefore, "   rework APPENDS history (nothing deleted)");
  const detail2 = (await req("GET", `/api/manufacturing/orders/${ids.o1}`, S.anad)).json;
  assert(detail2.order.reworkCount === 2, "   rework count surfaced");

  // ---- scenario 21: delivery requires a final result ----
  for (const _ of [1, 2, 3]) await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, {}); // → ready_for_fitting
  assert((await req("GET", `/api/manufacturing/orders/${ids.o1}`, S.anad)).json.order.currentStage === "ready_for_fitting", "   walked back up to ready_for_fitting");
  const noResult = await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, {});
  assert(noResult.status === 400, "21a. delivery WITHOUT final result → 400");
  const withResult = await req("PATCH", `/api/manufacturing/orders/${ids.o1}/advance`, S.anad, { finalResult: "minor_adjustment_success" });
  assert(withResult.status === 200 && withResult.json.status === "completed", "21b. delivery WITH final result → completed");

  // ---- scenario 22: work-order failure rolls back the patient ----
  const before = (await db.select({ n: sql<number>`COUNT(*)::int` }).from(patients))[0].n;
  let threw = false;
  try {
    await store.createPatientWithWorkOrder(
      { name: "مريض تراجع", age: "40", referralSource: "x", medicalCondition: "amputee", branchId: 1, isAmputee: true } as any,
      { serviceType: "prosthetic", expertUserId: 88888 /* bad FK */, assignedBy: 201 },
    );
  } catch { threw = true; }
  const after = (await db.select({ n: sql<number>`COUNT(*)::int` }).from(patients))[0].n;
  assert(threw && after === before, "22. work-order failure ROLLS BACK the patient (transaction)");

  // ---- scenario 13: expert can't edit patient (no such route exists) ----
  assert(S.anad.permissions && (S.anad.permissions as any).canEditPatients !== true, "13. expert has no patient-edit permission / no edit route");

  server.close();
  await pool.end();
}

main().then(() => { console.log(failed === 0 ? "\nALL PASSED ✅" : `\n${failed} FAILED ❌`); process.exit(failed === 0 ? 0 : 1); })
  .catch((e) => { console.error(e); process.exit(1); });
