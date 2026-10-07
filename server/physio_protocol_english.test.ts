// النسخةُ الإنكليزية لبروتوكولات العلاج الطبيعي (ترحيل ١٠٨، §4.cj — ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-protocol-english` — على Postgres محلّي.
//
// يحرس: (أ) لكلّ بروتوكولٍ مزروع نصوصُه الستّة بالإنكليزية، ولكلّ نصٍّ في سطور الأجهزة ترجمتُه — فلا يسقط الترحيلُ على الإنتاج؛
// (ب) الترجمةُ تملأ الفارغَ وحده **وحيث العربيةُ نصُّ الزرع حرفياً**: ما عدّله سليمٌ لا تُلصَق به ترجمةُ نصٍّ لم يعد موجوداً،
// وما كتبه أحدٌ بالإنكليزية لا يُكتب فوقه؛ (ج) الإعادةُ لا تغيّر شيئاً؛ (د) `localizedText` يختار اللغةَ ويقع على الأخرى ويقول ذلك.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { pool } from "./db";
import { SEED, sql as seedSql } from "./migrations/107_physio_protocol_seed";
import { DEVICE_TEXT_EN, PROTOCOL_TEXT_EN, sql as englishSql } from "./migrations/108_physio_protocol_english";
import { localizedText } from "@shared/physio_protocols";

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
const EDITED = SEED[0];   // عدّل سليمٌ عربيّتَه قبل الترحيل
const WRITTEN = SEED[1];  // كتب أحدٌ إنكليزيّتَه قبل الترحيل
const LINE = SEED[1].devices.find(([, , params]) => !!params)!; // سطرُ جهازٍ عُدّلت معاملاتُه

async function cleanup() { await q(`DELETE FROM physio_protocols WHERE code = ANY($1::text[])`, [CODES]); }

async function main() {
  console.log("\n── أ. التغطية ──");
  same("أ.١ لكلّ بروتوكولٍ مزروعٍ نصوصُه الإنكليزية", CODES.filter((c) => !PROTOCOL_TEXT_EN[c] || PROTOCOL_TEXT_EN[c].some((t) => !t.trim())), []);
  same("أ.٢ ولا ترجمةَ لبروتوكولٍ غير مزروع", Object.keys(PROTOCOL_TEXT_EN).filter((c) => !CODES.includes(c)), []);
  same("أ.٣ ولكلّ نصٍّ في سطور الأجهزة ترجمتُه",
    SEED.flatMap((p) => p.devices.flatMap(([, , params, , note]) => [params, note]).filter((t): t is string => !!t && !DEVICE_TEXT_EN[t])), []);
  check(!/[؀-ۿ]/.test(JSON.stringify(PROTOCOL_TEXT_EN) + JSON.stringify(Object.values(DEVICE_TEXT_EN))), "أ.٤ ولا حرفَ عربيّاً في الإنكليزية");

  console.log("\n── د. اختيارُ اللغة ──");
  same("د.١ الإنكليزيةُ حين تُطلَب وتوجد", localizedText({ goals: "أ", goalsEn: "A" }, "goals", "en"), { text: "A", fallback: false });
  same("د.٢ والعربيةُ حين تُطلَب", localizedText({ goals: "أ", goalsEn: "A" }, "goals", "ar"), { text: "أ", fallback: false });
  same("د.٣ والغائبةُ تقع على الأخرى وتقول ذلك", localizedText({ goals: "أ", goalsEn: "  " }, "goals", "en"), { text: "أ", fallback: true });
  same("د.٤ ولا هذه ولا تلك ⟵ لا شيء", localizedText({ goals: null }, "goals", "en"), { text: null, fallback: false });

  await cleanup();
  try {
    await q(seedSql);
    await q(`UPDATE physio_protocols SET summary = 'عدّله سليم' WHERE code = $1`, [EDITED.code]);
    await q(`UPDATE physio_protocols SET goals_en = 'Written by Saleem' WHERE code = $1`, [WRITTEN.code]);
    await q(`UPDATE physio_protocol_devices pd SET parameters = 'معاملاتٌ عدّلها سليم' FROM physio_protocols p, devices d
             WHERE pd.protocol_id = p.id AND pd.device_id = d.id AND p.code = $1 AND d.code = $2`, [WRITTEN.code, LINE[0]]);
    await q(englishSql);

    console.log("\n── ب. الفارغُ وحده، وحيث العربيةُ نصُّ الزرع ──");
    const rows = (await q(`SELECT code, summary_en, goals_en, precautions_en FROM physio_protocols WHERE code = ANY($1::text[])`, [CODES])).rows;
    const byCode = new Map(rows.map((r) => [r.code, r]));
    same("ب.١ المعدَّلُ عربيّاً بلا إنكليزيةٍ لنصّه القديم", byCode.get(EDITED.code)?.summary_en, null);
    same("ب.٢ …وحقولُه الأخرى تُرجمت", byCode.get(EDITED.code)?.goals_en, PROTOCOL_TEXT_EN[EDITED.code][1]);
    same("ب.٣ والمكتوبُ بالإنكليزية لا يُكتب فوقه", byCode.get(WRITTEN.code)?.goals_en, "Written by Saleem");
    same("ب.٤ وبقيّةُ البروتوكولات كلُّها مُترجَمة",
      rows.filter((r) => r.code !== EDITED.code && r.code !== WRITTEN.code && (!r.summary_en || !r.goals_en || !r.precautions_en)).map((r) => r.code), []);
    const line = (await q(`SELECT pd.parameters_en FROM physio_protocol_devices pd JOIN physio_protocols p ON p.id = pd.protocol_id
      JOIN devices d ON d.id = pd.device_id WHERE p.code = $1 AND d.code = $2`, [WRITTEN.code, LINE[0]])).rows[0];
    same("ب.٥ وسطرُ الجهاز المعدَّل بلا ترجمةٍ قديمة", line?.parameters_en, null);
    const lines = (await q(`SELECT count(*) FILTER (WHERE pd.parameters IS NOT NULL AND pd.parameters_en IS NULL) AS miss
      FROM physio_protocol_devices pd JOIN physio_protocols p ON p.id = pd.protocol_id WHERE p.code = ANY($1::text[])`, [CODES])).rows[0];
    same("ب.٦ وكلُّ سطرٍ آخر مُترجَم", Number(lines.miss), 1);

    console.log("\n── ج. الإعادة ──");
    const snap = async () => (await q(`SELECT code, summary_en, goals_en, assessment_en, exercises_en, contraindications_en, precautions_en
      FROM physio_protocols WHERE code = ANY($1::text[]) ORDER BY code`, [CODES])).rows;
    const before = await snap();
    await q(englishSql);
    same("ج.١ الإعادةُ لا تغيّر شيئاً", await snap(), before);
  } finally {
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
