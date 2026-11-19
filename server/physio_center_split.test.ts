// **فصلُ العلاج الطبيعي في بغداد إلى «مركز بغداد للعلاج الطبيعي»** (قرارُ المالك، يسري ٢٠٢٦-١١-٢١ — §4.gq).
// `npm run test:physio-center-split` — حيٌّ على Postgres محلّي وعلى النقاط الحقيقية.
//
// ما يحرسه: الفرعُ المضاف بعد الخمسة يظهر في شاشة الدخول ويُدخَل بمفتاحه، ودفترُه «علاج طبيعي» وحده، وترويستُه وأرقامُه،
// وصندوقُه في دليل الحسابات بلا تكرارٍ لغيره، وحالةُ العلاج الطبيعي تولد في فرع الحركة، والمتابعاتُ وورقةُ العلاج الطبيعي
// بفرع قسمه لا بفرع التسجيل.

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes, loginBranchIdOf } from "./routes";
import { storage } from "./storage";
import { branchCashConfig, isPhysioCenterName } from "@shared/cash_book";
import { intakeHeader } from "@shared/intake_sheet";
import { CENTER_CONTACTS } from "@shared/patient_card";
import { computeActiveReminders } from "./followups/service";
import { physioSheetFor } from "./physio_sheet/store";
import { seedChartOfAccounts } from "./migrations/seed_chart_of_accounts";

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

const PORT = 7311;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فصل-العلاج-الطبيعي";
const EMP = 99910;
const PASSWORD = "pw-physio-split";
const BAGHDAD = 1, CENTER = 6;
const CENTER_NAME = "مركز بغداد للعلاج الطبيعي";

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

const sessions = new Map<string, any>();
async function call(sid: string, method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json", "x-sid": sid },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const login = (sid: string, branchKey: string) =>
  call(sid, "POST", "/api/verify-branch", { branchKey, username: "ps-emp", password: PASSWORD });

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM follow_up_calls WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = $1`, [EMP]);
  await q(`DELETE FROM chart_of_accounts WHERE account_code = '111106' AND branch_id IS NULL`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'ذي قار'),(4,'الموصل'),(5,'كركوك')
           ON CONFLICT DO NOTHING`);

  console.log("\n── أ. قواعدُ الاسم ──");
  same("أ١. **دفترُ المركز «علاج طبيعي» وحده بلا نسب** — يسبق قاعدةَ «بغداد» التي يحملها اسمُه",
    branchCashConfig(CENTER_NAME),
    { books: ["physio"], drRatioPct: null, hospitalRatioPct: null, hasAtabahRatio: false, defaultBook: "physio" });
  same("أ٢. وبغدادُ الأطراف كما كانت (دفتران)", branchCashConfig("بغداد").books, ["devices", "physio"]);
  same("أ٣. والقاعدةُ لا تلمس غيره", [isPhysioCenterName(CENTER_NAME), isPhysioCenterName("بغداد"), isPhysioCenterName("ذي قار")],
    [true, false, false]);
  same("أ٤. ترويستُه: اسمُه كما وافق عليه المالكُ وشعارُ بايونك، والمدينةُ وحيُّها",
    intakeHeader(CENTER_NAME), { brand: "bionic", centerName: CENTER_NAME, city: "بغداد - السيدية" });
  same("أ٥. وترويسةُ بغداد كما كانت", intakeHeader("بغداد").centerName, "مركز بايونك للأطراف الصناعية الذكية والتأهيل الطبي");
  const contact = CENTER_CONTACTS.find((c) => c.branch.includes(CENTER_NAME) || CENTER_NAME.includes(c.branch));
  same("أ٦. أرقامُه وعنوانُه في البطاقة وأوراق الطباعة (بمطابقة الطباعة نفسِها)",
    [contact?.phones, contact?.services, !!contact?.address], [["07751119333"], "علاج طبيعي فقط", true]);
  const bg = CENTER_CONTACTS.find((c) => c.branch.includes("بغداد") || "بغداد".includes(c.branch));
  same("أ٧. و«بغداد» يجد رقمَي الأطراف لا رقمَ المركز", [bg?.branch, bg?.services], ["بغداد بايونك", "أطراف ومساند فقط"]);
  same("أ٨. مفتاحُ الدخول: الثابتُ والمضافُ رقماً، والمسؤولُ والمجهولُ بلا فرع",
    [loginBranchIdOf("baghdad"), loginBranchIdOf("branch-6"), loginBranchIdOf("admin"), loginBranchIdOf("x"), loginBranchIdOf("branch-")],
    [1, 6, null, null, null]);

  console.log("\n── ب. صندوقُ الفرع في دليل الحسابات ──");
  await seedChartOfAccounts();
  //  رمزٌ قديم بلا فرع على الموضع السادس — كان البذرُ بالترتيب يراه «موجوداً» فيتخطّى المركزَ بلا صندوق.
  await q(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_name_en, account_type, normal_balance, is_system)
           VALUES ('111106','صندوق قديم','Old cash','asset','debit',false) ON CONFLICT DO NOTHING`);
  const before = await q(`SELECT branch_id, account_code FROM chart_of_accounts WHERE account_code LIKE '1111__' ORDER BY branch_id, account_code`);
  await q(`INSERT INTO branches (id,name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [CENTER, CENTER_NAME]);
  await seedChartOfAccounts();
  const after = await q(`SELECT branch_id, account_code FROM chart_of_accounts WHERE account_code LIKE '1111__' ORDER BY branch_id, account_code`);
  const centerAcc = after.filter((a) => Number(a.branch_id) === CENTER);
  same("ب١. **للمركز صندوقٌ واحد** — والقيدُ الآليّ يجده (`branch_id` + `1111%`)", centerAcc.length, 1);
  same("ب٢. وصناديقُ الفروع القائمة لم تتغيّر ولم تتكرّر",
    after.filter((a) => Number(a.branch_id) !== CENTER), before);
  check(!before.some((a) => a.account_code === centerAcc[0]?.account_code), "ب٣. ورمزُه لم يكن لغيره", JSON.stringify(after));
  await seedChartOfAccounts();
  same("ب٤. وإعادةُ البذر لا تُضيف شيئاً",
    (await q(`SELECT count(*)::int AS n FROM chart_of_accounts WHERE account_code LIKE '1111__'`))[0].n, after.length);

  const hash = await bcrypt.hash(PASSWORD, 10);
  //  حسابُ رقيّة: مديرةُ المركز وحده — لا صلةَ لها ببغداد الأطراف.
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
             can_view_patients,can_add_patients,can_add_payments,can_view_payments)
           VALUES ($1,'ps-emp',$2,'مديرة المركز','branch_manager',$3,$4::jsonb,true,true,true,true,true)
           ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, branch_id=EXCLUDED.branch_id,
             branch_ids=EXCLUDED.branch_ids, is_active=true`,
    [EMP, hash, CENTER, JSON.stringify([CENTER])]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const sid = String(req.headers["x-sid"] ?? "");
    if (!sessions.has(sid)) sessions.set(sid, {});
    req.session = sessions.get(sid);
    req.session.save = (cb?: any) => cb?.();
    req.session.regenerate = (cb?: any) => cb?.();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  try {
    console.log("\n── ج. شاشةُ الدخول ──");
    const list = await call("anon", "GET", "/api/public/closed-branches");
    same("ج١. **المركزُ في قائمة الدخول باسمه** — والخمسةُ الثابتة لا تتكرّر",
      list.body?.extra, [{ id: CENTER, name: CENTER_NAME }]);
    const inC = await login("c", `branch-${CENTER}`);
    same("ج٢. مديرتُه تدخله بمفتاحه وجلستُها المركز",
      [inC.status, inC.body?.branchId, sessions.get("c")?.branchSession?.branchId], [200, CENTER, CENTER]);
    same("ج٣. ولا تدخل بغدادَ الأطراف", (await login("b", "baghdad")).status, 401);
    //  وحسابٌ لفرعين (بغداد أوّلاً) يدخل المركزَ باختياره — لا أوّلَ فروعه.
    await q(`UPDATE system_users SET branch_ids = $2::jsonb, branch_id = $3 WHERE id = $1`, [EMP, JSON.stringify([BAGHDAD, CENTER]), BAGHDAD]);
    const two = await login("two", `branch-${CENTER}`);
    same("ج٣ب. **مَن له فرعان يدخل المركزَ بمفتاحه**", [two.status, sessions.get("two")?.branchSession?.branchId], [200, CENTER]);
    await q(`UPDATE system_users SET branch_ids = $2::jsonb, branch_id = $3 WHERE id = $1`, [EMP, JSON.stringify([CENTER]), CENTER]);
    await q(`UPDATE branches SET temporarily_closed = true WHERE id = $1`, [CENTER]);
    const { invalidateClosedBranches } = await import("./branches/closure");
    invalidateClosedBranches();
    const closedList = await call("anon", "GET", "/api/public/closed-branches");
    same("ج٤. والمغلقُ مؤقتاً يخرج من القائمة", [closedList.body?.extra, closedList.body?.ids?.includes(CENTER)], [[], true]);
    await q(`UPDATE branches SET temporarily_closed = false WHERE id = $1`, [CENTER]);
    invalidateClosedBranches();

    console.log("\n── د. حالةُ العلاج الطبيعي ومتابعاتُه وورقتُه بفرع القسم ──");
    //  مريضُ أطرافٍ مسجَّلٌ في بغداد، يأتي المركزَ للعلاج الطبيعي.
    const [p] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, total_cost)
       VALUES ('مريض فصل','07701239876',$1,'40','بتر',$2,true,0) RETURNING id`, [MARK, BAGHDAD]);
    await storage.ensurePhysiotherapyCase(p.id, undefined, { userId: EMP, userName: "مديرة المركز" }, CENTER);
    const [c] = await q(`SELECT branch_id FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [p.id]);
    same("د١. **الحالةُ تولد في فرع الحركة** لا في فرع التسجيل", Number(c?.branch_id), CENTER);
    //  وبلا فرع حركة: كما كانت (فرعُ التسجيل).
    const [p2] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, total_cost)
       VALUES ('مريض بغداد','07701239877',$1,'40','ظهر',$2,true,0) RETURNING id`, [MARK, BAGHDAD]);
    await storage.ensurePhysiotherapyCase(p2.id);
    const [c2] = await q(`SELECT branch_id FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [p2.id]);
    same("د٢. وبلا فرع حركة: فرعُ التسجيل كما كان", Number(c2?.branch_id), BAGHDAD);

    //  آخرُ زيارة قبل عشرين يوماً — منقطع.
    for (const id of [p.id, p2.id]) {
      await q(`INSERT INTO visits (patient_id, branch_id, visit_date, treatment_type, session_count)
               VALUES ($1,$2, now() - interval '20 days','physiotherapy',1)`, [id, BAGHDAD]);
    }
    const inCenter = (await computeActiveReminders(CENTER)).map((r: any) => [r.patientId, r.branchId]);
    const inBaghdad = (await computeActiveReminders(BAGHDAD)).map((r: any) => [r.patientId, r.branchId]);
    same("د٣. **المتابعةُ عند المركز** لمريضه ولو كان مسجَّلاً في بغداد",
      inCenter.filter(([id]) => id === p.id || id === p2.id), [[p.id, CENTER]]);
    same("د٤. وبغدادُ تتابع مريضَ قسمها وحده", inBaghdad.filter(([id]) => id === p.id || id === p2.id), [[p2.id, BAGHDAD]]);
    const all = (await computeActiveReminders()).filter((r: any) => r.patientId === p.id);
    same("د٥. والقائمةُ الجامعة تقول فرعَ القسم واسمَه", [all[0]?.branchId, all[0]?.branchName], [CENTER, CENTER_NAME]);
    //  مراجعةُ Codex على #745: القائمةُ تعرضه للمركز، فتسجيلُ الاتّصال من المركز يُقبل ويُكتب بفرعه.
    const logged = await call("c", "POST", "/api/follow-ups", { patientId: p.id, outcomeNote: "اتّصلنا — يعود الأحد" });
    same("د٥ب. **موظّفةُ المركز تسجّل الاتّصالَ بمريضه** — والسطرُ بفرع القسم",
      [logged.status, logged.body?.branchId], [200, CENTER]);
    const fromBaghdad = await call("b2", "POST", "/api/verify-branch", { branchKey: "baghdad", username: "ps-emp", password: PASSWORD });
    same("د٥ج. (وموظّفُ بغداد لا يدخل بهذا الحساب أصلاً)", fromBaghdad.status, 401);
    same("د٥د. والمسجَّلُ خرج من قائمة المركز",
      (await computeActiveReminders(CENTER)).some((r: any) => r.patientId === p.id), false);

    const sheet = await physioSheetFor(p.id, { withMoney: false, session: sessions.get("c")?.branchSession });
    same("د٦. **ترويسةُ ورقة العلاج الطبيعي فرعُ القسم**", (sheet as any)?.patient?.branchName, CENTER_NAME);
    const sheet2 = await physioSheetFor(p2.id, { withMoney: false, session: sessions.get("c")?.branchSession });
    same("د٧. وورقةُ مريض بغداد ببغداد", (sheet2 as any)?.patient?.branchName, "بغداد");
  } finally {
    await cleanup();
    httpServer.close();
  }

  console.log(failures === 0 ? "\n✅ كلُّ التأكيدات نجحت" : `\n❌ ${failures} تأكيداً سقط`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
