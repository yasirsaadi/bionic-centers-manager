// زرعُ مكتبة بروتوكولات العلاج الطبيعي (ترحيل ١٠٧، §4.cj — المرحلةُ ٢ب، ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-protocol-seed` — على Postgres محلّي.
//
// يحرس: (أ) كلُّ بروتوكولٍ مزروع يجتاز تحقّقَ نقطة الكتابة نفسِها (`parseProtocolBody`) — فلا يدخل بالترحيل ما يُرفض من الشاشة؛
// (ب) كلُّ جهازٍ من الخمسةَ عشر بلا تكرار، وكلُّ مرجعٍ يجتاز `normalizeReferences`؛ (ج) كلُّها مسوّدات بلا معتمِد؛
// (د) الإعادةُ لا تكرّر شيئاً؛ (هـ) بروتوكولٌ بالرمز نفسِه عدّله أحدٌ لا يُمَسّ هو ولا أجهزتُه.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { pool } from "./db";
import { SEED, sql as seedSql } from "./migrations/107_physio_protocol_seed";
import { parseProtocolBody } from "./physio_protocols/routes";
import { normalizeReferences } from "@shared/physio_protocols";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const q = (t: string, p: any[] = []) => pool.query(t, p);
const CODES = SEED.map((p) => p.code);
const KEEP = SEED[0].code; // بروتوكولٌ «عدّله أحدٌ» قبل الزرع

async function cleanup() {
  await q(`DELETE FROM physio_protocols WHERE code = ANY($1::text[])`, [CODES]);
}

async function main() {
  await cleanup();
  try {
    const devices = (await q(`SELECT id, code FROM devices`)).rows as { id: number; code: string }[];
    const idOf = new Map(devices.map((d) => [d.code, d.id]));

    console.log("\n── أ. كلُّ بروتوكولٍ يجتاز تحقّقَ الشاشة ──");
    const invalid = SEED.map((p) => {
      const r = parseProtocolBody({
        code: p.code, titleAr: p.titleAr, titleEn: p.titleEn, category: p.category, ageGroup: p.ageGroup,
        summary: p.summary, goals: p.goals, assessment: p.assessment, exercises: p.exercises,
        contraindications: p.contraindications, precautions: p.precautions,
        sessionsPerWeek: p.spw, durationWeeks: p.weeks, sessionMinutes: p.minutes, references: p.refs,
        devices: p.devices.map(([code, evidence, parameters, minutes, note]) => ({ deviceId: idOf.get(code) ?? -1, evidence, parameters, minutes, note })),
      });
      return typeof r === "string" ? `${p.code}: ${r}` : null;
    }).filter(Boolean);
    same("أ.١ لا بروتوكولَ يرفضه تحقّقُ الكتابة", invalid, []);
    same("أ.٢ الرموزُ فريدة", new Set(CODES).size, SEED.length);
    check(SEED.length >= 40, "أ.٣ نحو أربعين بروتوكولاً", String(SEED.length));

    console.log("\n── ب. الأجهزةُ والمراجع ──");
    same("ب.١ كلُّ جهازٍ من القائمة", SEED.flatMap((p) => p.devices.filter(([c]) => !idOf.has(c)).map(([c]) => `${p.code}:${c}`)), []);
    same("ب.٢ ولا جهازَ مكرّرٌ في بروتوكول", SEED.filter((p) => new Set(p.devices.map(([c]) => c)).size !== p.devices.length).map((p) => p.code), []);
    same("ب.٣ كلُّ مرجعٍ صالح", SEED.filter((p) => normalizeReferences(p.refs)?.length !== p.refs.length).map((p) => p.code), []);
    same("ب.٤ ولكلّ بروتوكولٍ «التمارين» موصىً بها", SEED.filter((p) => !p.devices.some(([c, e]) => c === "exercise" && e === "recommended")).map((p) => p.code), []);
    same("ب.٥ والإبرُ الجافة حيث وُضعت تقول لمن", SEED.flatMap((p) => p.devices.filter(([c, e, , , n]) => c === "needle" && e !== "not_recommended" && !String(n ?? "").includes("الإبر الجافة")).map(() => p.code)), []);

    console.log("\n── ج. الزرعُ مسوّدات ──");
    // بروتوكولٌ بالرمز نفسِه عدّله أحدٌ قبل الزرع — بجهازٍ واحد
    const [kept] = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status, approved_by_name)
      VALUES ($1, 'عدّله سليم', 'Edited', 'spine', 'adult', 'approved', 'سليم') RETURNING id`, [KEEP])).rows;
    await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence) VALUES ($1, $2, 'optional')`, [kept.id, idOf.get("laser")]);
    await q(seedSql);
    const rows = (await q(`SELECT code, status, approved_by, approved_at FROM physio_protocols WHERE code = ANY($1::text[]) AND code <> $2`, [CODES, KEEP])).rows;
    same("ج.١ كلُّ البقية زُرعت", rows.length, SEED.length - 1);
    same("ج.٢ كلُّها مسوّدات بلا معتمِد", rows.filter((r) => r.status !== "draft" || r.approved_by !== null || r.approved_at !== null).map((r) => r.code), []);
    const lines = Number((await q(`SELECT count(*) FROM physio_protocol_devices pd JOIN physio_protocols p ON p.id = pd.protocol_id
      WHERE p.code = ANY($1::text[]) AND p.code <> $2`, [CODES, KEEP])).rows[0].count);
    same("ج.٣ وكلُّ أجهزتها", lines, SEED.slice(1).reduce((a, p) => a + p.devices.length, 0));
    const ord = (await q(`SELECT d.code FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id JOIN physio_protocols p ON p.id = pd.protocol_id
      WHERE p.code = $1 ORDER BY pd.display_order`, [SEED[1].code])).rows.map((r) => r.code);
    same("ج.٤ بترتيبها", ord, SEED[1].devices.map(([c]) => c));

    console.log("\n── د. الإعادةُ لا تكرّر ──");
    await q(seedSql);
    same("د.١ البروتوكولاتُ كما هي", Number((await q(`SELECT count(*) FROM physio_protocols WHERE code = ANY($1::text[])`, [CODES])).rows[0].count), SEED.length);
    same("د.٢ والأجهزةُ كما هي", Number((await q(`SELECT count(*) FROM physio_protocol_devices pd JOIN physio_protocols p ON p.id = pd.protocol_id
      WHERE p.code = ANY($1::text[]) AND p.code <> $2`, [CODES, KEEP])).rows[0].count), lines);

    console.log("\n── هـ. المعدَّلُ قبل الزرع لا يُمَسّ ──");
    same("هـ.١ عنوانُه وحالتُه", (await q(`SELECT title_ar, status FROM physio_protocols WHERE id = $1`, [kept.id])).rows[0], { title_ar: "عدّله سليم", status: "approved" });
    same("هـ.٢ وجهازُه الوحيد", (await q(`SELECT d.code FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id WHERE pd.protocol_id = $1`, [kept.id])).rows.map((r) => r.code), ["laser"]);
  } finally {
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
